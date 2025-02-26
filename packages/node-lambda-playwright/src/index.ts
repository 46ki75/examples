export const handler = async (event: any) => {
  return { message: "Hello from node-lambda-playwright", env: process.env };
};
