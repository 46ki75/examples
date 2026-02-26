import type { APIGatewayProxyEventQueryStringParameters } from "aws-lambda";

export const parseQueryParams = async (
  queryParams?: APIGatewayProxyEventQueryStringParameters
): Promise<{ name: string }> => {
  return { name: queryParams?.name ?? "Lambda" };
};
