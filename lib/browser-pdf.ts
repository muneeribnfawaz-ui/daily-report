import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { LaunchOptions } from "puppeteer-core";

const LOCAL_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function getLaunchOptions(): Promise<LaunchOptions> {
  if (process.env.CHROME_PATH) {
    return {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: process.env.CHROME_PATH,
      headless: true
    };
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return {
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell"
    };
  }

  return {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: LOCAL_CHROME_PATH,
    headless: true
  };
}

export async function renderPdfFromHtml(html: string) {
  const browser = await puppeteer.launch(await getLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("screen");
    await page.evaluate(async () => {
      // Wait for fonts and layout to settle before measuring height.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fonts = (document as any).fonts;
      if (fonts?.ready) {
        await fonts.ready;
      }
    });

    const contentSize = await page.evaluate(() => {
      const body = document.body;
      const htmlElement = document.documentElement;
      const pageElement = document.querySelector<HTMLElement>(".page");

      const width = Math.ceil(pageElement?.getBoundingClientRect().width ?? Math.max(body.scrollWidth, htmlElement.scrollWidth, 1));
      const height = Math.ceil(Math.max(body.scrollHeight, htmlElement.scrollHeight, pageElement?.scrollHeight ?? 0, 1) + 160);

      return { width, height };
    });

    await page.addStyleTag({
      content: `
        @page {
          size: ${contentSize.width}px ${contentSize.height}px;
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${contentSize.width}px;
          height: ${contentSize.height}px;
          overflow: visible !important;
          background: #fff !important;
        }
      `
    });

    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });
  } finally {
    await browser.close();
  }
}
