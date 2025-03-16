#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";

import { GlueDataCatalogStack } from "../lib/glue-data-catalog";
import { CustomResourceStack } from "../lib/custom-resource";

const app = new cdk.App();

new GlueDataCatalogStack(app, "GlueDataCatalog");
new CustomResourceStack(app, "CustomResource");
