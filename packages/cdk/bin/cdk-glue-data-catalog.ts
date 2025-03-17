#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";

import { GlueDataCatalogStack } from "../lib/glue-data-catalog";
import { CustomResourceStack } from "../lib/custom-resource";
import { ApiGatewayRestStack } from "../lib/api-gateway-rest";

const app = new cdk.App();

new ApiGatewayRestStack(app, "ApiGatewayRest");
new GlueDataCatalogStack(app, "GlueDataCatalog");
new CustomResourceStack(app, "CustomResource");
