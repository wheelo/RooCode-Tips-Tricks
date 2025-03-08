# Browser Automation in Roo-Code: Technical Guide

## Overview

The browser automation system in Roo-Code provides a powerful mechanism for interacting with web content directly from the AI assistant. This technical guide explores the implementation details, API integration, and advanced capabilities of the browser automation feature.

## Core Architecture

Browser automation in Roo-Code is built on Puppeteer, a Node.js library that provides a high-level API to control Chrome/Chromium browsers. This implementation follows a controller pattern:

```typescript
// Main controller class
export class BrowserController {
  private browser: puppeteer.Browser | null = null
  private page: puppeteer.Page | null = null
  private isActive = false
  private viewportSize: ViewportSize = { width: 1280, height: 800 }
  private consoleLogs: ConsoleMessage[] = []
  
  // Core methods for browser control and interaction
  async launch(url: string): Promise<BrowserActionResult> { /* ... */ }
  async handleClick(coordinate: string): Promise<BrowserActionResult> { /* ... */ }
  async handleType(text: string): Promise<BrowserActionResult> { /* ... */ }
  async handleScroll(scrollDown: boolean): Promise<BrowserActionResult> { /* ... */ }
  async close(): Promise<BrowserActionResult> { /* ... */ }
}
```

### Command Flow

The browser action workflow follows a specific sequence:

1. **Launch**: Open browser with specified URL
2. **Interaction**: Perform a series of actions (click, type, scroll)
3. **Feedback**: Capture screenshot and console logs after each action
4. **Close**: Explicitly terminate the browser session

### Integration with the LLM

The browser automation capabilities are exposed to the LLM through the `browser_action` tool:

```typescript
// Tool definition provided to the LLM
export function getBrowserActionToolDescription(viewportSize: ViewportSize): string {
  return `
## browser_action
Description: Request to interact with a Puppeteer-controlled browser. Every action, except \`close\`, will be responded to with a screenshot of the browser's current state, along with any new console logs.
- The sequence of actions **must always start with** launching the browser at a URL, and **must always end with** closing the browser.
- The browser window has a resolution of **${viewportSize.width}x${viewportSize.height}** pixels.
Parameters:
- action: (required) The action to perform. Available actions: launch, click, type, scroll_down, scroll_up, close.
- url: (optional) URL for the \`launch\` action.
- coordinate: (optional) X,Y coordinates for the \`click\` action.
- text: (optional) Text for the \`type\` action.
  `
}
```

## Key Implementation Details

### Launch Action

```typescript
async launch(url: string): Promise<BrowserActionResult> {
  if (this.isActive) {
    await this.close()
  }
  
  try {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })
    
    this.page = await this.browser.newPage()
    await this.page.setViewport(this.viewportSize)
    
    // Set up console logging
    this.setupConsoleCapture()
    
    // Navigate to URL
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    this.isActive = true
    
    // Return screenshot and status
    const screenshot = await this.takeScreenshot()
    return { 
      success: true,
      message: `Browser launched and navigated to ${url}`,
      screenshot,
      logs: this.getAndClearConsoleLogs()
    }
  } catch (error) {
    // Error handling...
  }
}
```

### Click Action

```typescript
async handleClick(coordinate: string): Promise<BrowserActionResult> {
  if (!this.page) throw new Error("Browser page is not available")
  
  try {
    // Parse coordinates
    const [x, y] = coordinate.split(',').map(c => parseInt(c.trim(), 10))
    
    // Perform click
    await this.page.mouse.click(x, y)
    
    // Wait for any resulting activity
    await this.page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {})
    
    // Return updated state
    const screenshot = await this.takeScreenshot()
    return { 
      success: true,
      message: `Clicked at coordinates (${x},${y})`,
      screenshot,
      logs: this.getAndClearConsoleLogs()
    }
  } catch (error) {
    // Error handling...
  }
}
```

### Type Action

```typescript
async handleType(text: string): Promise<BrowserActionResult> {
  if (!this.page) throw new Error("Browser page is not available")
  
  try {
    // Type the text
    await this.page.keyboard.type(text)
    
    // Return updated state
    const screenshot = await this.takeScreenshot()
    return { 
      success: true,
      message: `Typed text: "${text}"`,
      screenshot,
      logs: this.getAndClearConsoleLogs()
    }
  } catch (error) {
    // Error handling...
  }
}
```

### Screenshot and Console Capture

```typescript
private async takeScreenshot(): Promise<Buffer> {
  if (!this.page) throw new Error("Browser page is not available")
  
  try {
    return await this.page.screenshot({ 
      type: 'jpeg',
      quality: 80,
      fullPage: false
    })
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error.message}`)
  }
}

private setupConsoleCapture(): void {
  if (!this.page) return
  
  // Capture console messages
  this.page.on('console', (msg) => {
    this.consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      time: new Date().toISOString()
    })
  })
}
```

## Advanced Usage Patterns

### Web Application Testing

```
// Sequential pattern for testing a web application
1. <browser_action><action>launch</action><url>http://localhost:3000</url></browser_action>
2. <browser_action><action>click</action><coordinate>150,200</coordinate></browser_action>
3. <browser_action><action>type</action><text>test@example.com</text></browser_action>
4. <browser_action><action>close</action></browser_action>
```

### Data Extraction

```
// Pattern for extracting data from a web page
1. <browser_action><action>launch</action><url>https://example.com/data</url></browser_action>
2. <browser_action><action>click</action><coordinate>100,200</coordinate></browser_action>
3. <browser_action><action>close</action></browser_action>
```

## Security Implementation

### URL Validation

```typescript
function validateUrl(url: string): boolean {
  const validProtocols = ['http:', 'https:', 'file:']
  try {
    const parsedUrl = new URL(url)
    return validProtocols.includes(parsedUrl.protocol)
  } catch (error) {
    return false
  }
}
```

### Sandbox Configuration

```typescript
const browser = await puppeteer.launch({
  headless: true,
  args: [
    // Security sandbox settings
    '--no-sandbox',
    '--disable-setuid-sandbox',
    
    // Access restrictions
    '--disable-file-system',
    '--disable-local-storage',
    '--disable-extensions',
    
    // Additional protections
    '--disable-background-networking',
    '--disable-default-apps'
  ]
})
```

## Technical Challenges and Solutions

### Memory Management

```typescript
export class BrowserResourceManager {
  private lastActivityTime: number = Date.now()
  private idleTimeout: number = 300000 // 5 minutes
  
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const currentTime = Date.now()
      const idleTime = currentTime - this.lastActivityTime
      
      // Auto-close after idle timeout
      if (idleTime > this.idleTimeout && this.browserController.isActive()) {
        this.browserController.close().catch(err => 
          console.error('Failed to auto-close browser:', err))
      }
    }, 60000) // Check every minute
  }
}
```

## Integration with Other Tools

The browser can be used to view HTML files created by other tools, execute web-based visualization, and test locally developed applications. This makes it a powerful tool in the Roo-Code ecosystem for web development, testing, and data visualization tasks.

## Best Practices

1. **Always Close**: End every browser session with a close action
2. **Coordinate from Screenshots**: Use screenshots to determine click coordinates
3. **Single-Action Pattern**: Perform one browser action at a time
4. **URL Validation**: Always use fully qualified URLs including protocol
5. **Error Handling**: Be prepared to handle and recover from browser errors

The browser automation feature in Roo-Code provides a powerful way to interact with web content, test applications, and create rich visual feedback loops when developing web applications.
