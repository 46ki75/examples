import type { Context } from "aws-lambda";
import playwright from "playwright-core";
import chromium from "chrome-aws-lambda";

export const handler = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _event: { key: string },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context?: Context
): Promise<{ title: string }> => {
  const browser = await playwright.chromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto("https://example.com");
  const title = await page.title();
  await browser.close();
  return { title };
};
