const CDP = require('chrome-remote-interface');
const fs = require('fs');

async function capture() {
    let client;
    try {
        // Find the Perplexity page
        const targets = await CDP.List();
        const target = targets.find(t => t.url.includes('perplexity.ai') && t.type === 'page');
        
        if (!target) {
            console.log('Perplexity page not found');
            return;
        }

        client = await CDP({ target: target.webSocketDebuggerUrl });
        const { Page, Runtime } = client;

        await Page.enable();
        await Runtime.enable();

        // Get some info about the page
        const { result } = await Runtime.evaluate({
            expression: 'document.body.innerText'
        });
        console.log('--- CONTENT START ---');
        console.log(result.value.substring(0, 5000));
        console.log('--- CONTENT END ---');

        // Capture screenshot
        const { data } = await Page.captureScreenshot({
            format: 'png',
            fromSurface: true
        });

        fs.writeFileSync('comet_screenshot.png', Buffer.from(data, 'base64'));
        console.log('Screenshot saved to comet_screenshot.png');

    } catch (err) {
        console.error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

capture();
