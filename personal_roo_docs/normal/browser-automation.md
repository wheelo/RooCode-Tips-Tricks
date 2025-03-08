# Browser Automation in Roo-Code

## What Is Browser Automation?

Browser automation lets Roo interact with web content directly. It can launch a web browser, navigate to sites, click buttons, type text, and scroll through pages - all while sending you screenshots of what it sees.

## When To Use Browser Automation

Use browser automation when you want Roo to:
- Test web applications you're developing
- Interact with websites to gather information
- Visualize web-based content
- Verify how websites render
- Fill out forms or navigate through multi-step processes

## Browser Actions

Roo can perform these browser actions:

| Action | Description |
|--------|-------------|
| Launch | Opens the browser and navigates to a URL |
| Click | Clicks at specific coordinates on the page |
| Type | Types text (usually after clicking on a field) |
| Scroll Up/Down | Scrolls the page up or down |
| Close | Closes the browser when finished |

## How It Works

Browser automation follows a specific workflow:

1. **Launch**: Roo always starts by launching the browser at a specific URL
2. **Actions**: You and Roo work together, with Roo performing one action at a time
3. **Feedback**: After each action, Roo shows you a screenshot and any console messages
4. **Close**: The session always ends by explicitly closing the browser

## Important Limitations

- The browser window has a fixed resolution of 1280×800 pixels
- Only one browser action can be performed at a time
- Roo must always start with launch and end with close
- While the browser is active, only browser actions can be used

## Using Browser Automation Effectively

### Testing Web Applications

To test a web application:
1. Ask Roo to launch the browser with your local development server URL
2. Guide Roo to test specific features by clicking and typing
3. Check the screenshots to verify proper rendering
4. Review console messages for any errors

Example: "Launch a browser pointing to http://localhost:3000 and test if the login form works correctly."

### Data Collection

To collect data from websites:
1. Ask Roo to launch the browser with the target website
2. Guide it to navigate to the relevant data
3. Have it interact with the page as needed to expose the data
4. Review the screenshots showing the data

Example: "Use the browser to check the current weather in San Francisco and show me the forecast."

### Form Filling

To complete online forms:
1. Ask Roo to launch the browser at the form URL
2. Have it click on form fields
3. After each click, tell it what to type
4. Guide it through form submission

Example: "Launch a browser to example.com/contact, fill out the contact form with my information, and submit it."

## Best Practices

1. **Be Specific**: Provide clear, precise instructions about what to click or where to navigate
2. **One Step at a Time**: Let Roo perform one action, then review before continuing
3. **Coordinate Clicking**: Use the screenshots to identify the x,y coordinates for clicks
4. **Handle Errors**: If something doesn't work, check console messages in the screenshots
5. **Always Close**: Make sure to close the browser when finished to free up resources

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Incorrect clicks | Use the screenshot to specify more precise coordinates |
| Page not loading | Make sure the URL is correct and the site is accessible |
| Text not appearing | Verify you clicked the correct input field first |
| Browser crashes | Try simplifying your task or breaking it into smaller steps |

## Security Considerations

- Browser automation only permits standard web navigation
- It can't access your local files beyond what you explicitly serve
- It operates in a sandboxed environment for security

## Getting Started

Try this simple example to get started:

"Can you launch a browser to weather.gov, navigate to the forecast for my area, and show me the weather for the next few days? Once you've found the forecast, please close the browser."