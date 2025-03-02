export const handler = async (event: any) => {
  if (event.message) {
    return { message: event.message };
  } else {
    return { message: "Hello World!" };
  }
};
