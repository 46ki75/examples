//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  preset: "aws-lambda",
  awsLambda: {
    streaming: true,
  },
});
