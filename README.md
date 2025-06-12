# Adobe Commerce Optimizer - Sample catalog data ingestion

Adobe Commerce Optimizer has a sample data set that emulates the catalog data for a fictional B2B2X Automobile conglomerate called Carvelo. This sample data and the Carvelo business structure provide the foundation for the [Storefront and Catalog Administrator end-to-end use case](https://experienceleague.adobe.com/en/docs/commerce/optimizer/use-case/admin-use-case) that demonstrates how to use a single base catalog to create catalog views that match sales operations for a complex business organization.

This repository provides the tools to ingest the sample data set into your Adobe Commerce Optimizer instance. The process uses the Adobe Commerce Optimizer Data Ingestion APIs and the Adobe Commerce Optimizer SDK.

**Important:** After you have uploaded the data, you must create the catalog views and policies from the Commerce Optimizer user interface as described in these instructions. Both the catalog data and the catalog views and policies are required to complete the end-to-end use case.

## What Will We Do?

You will ingest `Product Metadata`, `Product`, `Price Book`, and `Price` data for our Carvelo Automotive demo dataset.

Using our new Adobe Commerce Optimizer Typescript/Javascript SDK, we will ingest:

- Metadata for our Product attributes
- 1080 Products across our 3 brands (in batches of 100)
- 5 unique Price Books
- 6480 Prices across our 5 Price Books (in batches of 100)

After you complete the catalog ingestion, this readme guides you to create the catalog view and polices required to use the sample data with your Commerce storefront.

## Run the Sample Catalog Data Ingestion

### Get credentials and tenant ID for your instance

You need the following values to authenticate requests to ingest data from the sample data set to your Adobe Commerce Optimizer instance.

- **Tenant_ID**—Identifies the Adobe Commerce Optimizer instance targeted for data ingestion.
- **Adobe IMS `client_id` and `client_secret` credentials**—These authentication credentials are required to authenticate API requests for data ingestion. You create these credentials from the Adobe Developer Console, which requires an Adobe account with developer access to the Adobe Commerce Optimizer.

#### Get your tenant ID

Find your tenant ID in the access URLs for your Commerce Optimizer instance in Cloud Manager.

1. Log in to your [Adobe Experience Cloud](https://experience.adobe.com/) account.

1. Under **Quick access**, click **Commerce** to open the Commerce Cloud Manager.

   The Commerce Cloud Manager displays a list of instances that are available in your Adobe IMS organization.

1. To view the access URLs including the base URL for the REST and GraphQL APIs, click the information icon next to the instance name.

   <img width="895" alt="image" src="https://github.com/user-attachments/assets/2d24bb12-3ac4-46ed-aad5-9e85176da6ef" />


1. Your tenant ID is included in the endpoint details. For example, you can see it in the Catalog Endpoint that follows this pattern:

   https://na1-sandbox.api.commerce.adobe.com/{tenantId}/v1/catalog

   **Note:**  If you don't have access to the Commerce Cloud Manager, contact your system administrator.

#### Generate the IMS credentials for API authentication

You generate the `client_ID` and `client_secret` credentials from the Adobe Developer Console. You must have a system administrator or developer role for the Adobe Commerce Optimizer project to complete this configuration. See [User Management](https://helpx.adobe.com/enterprise/using/manage-developers.html) in the *Adobe Commerce Optimizer* documentation.

1. Log in to the [Adobe Developer Console](https://developer.adobe.com/console).

1. Select the Experience Cloud Organization for the integration.

1. Create an API project.

   - Add the **Adobe I/O Events for Adobe Commerce** API to your project. Then, click **Next**.

   - Configure the Client ID and Client Secret credentials by selecting the **OAUTH Server to Server Authentication** option.

   - Click **Save configured API**.

1. In the Connected Credentials section, view API configuration details by selecting **OAUTH Server-to-Server**.

   ![image](https://github.com/user-attachments/assets/34a7e7b2-9816-462b-8453-a28a22d673fa)

1. Copy the Client ID and the Client Secret values to a secure location.

### Configure environment variables

The `.env` file provides the configuration to instantiate the SDK client and provide secure communication between the client and Adobe Commerce Optimizer.

1. Clone this repository to your local development environment.

1. Open the `.env` file, and add the IMS client id and client secret crendentials from your Adobe I/O developer project.

   ```conf
   CLIENT_ID=my-client-id
   CLIENT_SECRET=my-client-secret
   ```
1. Add the tenant Id for your Adobe Commerce Optimizer instance. 

   ```conf
   TENANT_ID=my-tenant-id
   REGION=na1
   ENVIRONMENT=sandbox
   ```

### Start the Data Ingestion

Run the following command to use the [Adobe Commerce Optimizer SDK](https://github.com/adobe-commerce/aco-ts-sdk) to ingest the Carvelo sample data found in the `data` directory.

 ```bash
 node index.js
 ```

### Resetting the sample data

To reset the sample catalog data in your ACO instance, run the following script to delete the Carvelo catalog data loaded by the `index.js` ingestion script.

 ```shell
 node reset.js
 ```

## Review the API Documentation

For detailed information about the Data Ingestion API for Adobe Commerce Optimizer, see the [Data Ingestion API Reference](https://developer-stage.adobe.com/commerce/services/composable-catalog/data-ingestion/api-reference/)

## Create catalog views and policies

From the Adobe Commerce Optimizer user interface, create the catalog views and policies required to use the sample data with your storefront.

### Create policies

1. Login to Adobe Commerce Optimizer.

1. Navigate to Catalog > Policies. You will be creating 4 universal policies and 2 exclusive policies. ([Read more](https://experienceleague.adobe.com/en/docs/commerce/optimizer/catalog/policies#value-source-types) about policy types)

1. Create four universal policies:

   - Click **Add Policy**
   - Add the policy name: `West Coast Inc brands`
   - Click **Add Filter**, and add the following details:

     Attribute: `brand`
     Operator: `IN`
     Value source: `STATIC`
     Value: `Aurora, Bolt, Cruz`

     The modal should look like the screenshot below.

     ![Screenshot 2025-06-11 at 3 39 28 PM](https://github.com/user-attachments/assets/c0779c47-3445-4823-9faa-d545ac1fcdf4)

   - Click **Save**.
   - Activate the policy you have just created by clicking the action dots (…) and selecting **Enable**.
   - Click on the back arrow to return to the policy list page.

   Repeat the above steps to create 3 more universal policies. Use the following details:

   | Policy Name  | Attribute | Operator | Value source | Value |
   | ------------- | ------------- | ------------- | ------------- | ------------- |
   | East Coast Inc brands  | brand  | IN | STATIC | Bolt, Cruz |
   | Arkbridge part categories  | part_category  | IN | STATIC | tires, brakes, suspension |
   | Kingsbluff part categories | part_category | IN | STATIC | tires, brakes |

1. Create two exclusive poicies.

   - Click **Add Policy**
   - Add the policy name: `Brand`
   - Click **Add Trigger**, and add the following details:
     Name: `AC-Policy-Brand`
     Transport type: `HTTP_HEADER`
   - Click **Save**.
   - Click **Add Filter**, and add the following details:
     Attribute: `brand`
     Operator: `IN`
     Value source: `TRIGGER`
     Value: `AC-Policy-Brand`
   - Click **Save**.
   - Activate the policy by clicking on the action dots (…) and selecting **Enable**.

    Repeat the above steps to create one more universal policy. Use the following details:

    | Policy Name  | Trigger - Name | Trigger - transport type | Attribute | Operator | Value source | Value |
    | ------------- | ------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
    | Model  | AC-Policy-Model  | HTTP_HEADER | model | IN | TRIGGER | AC-Policy-Model |

    After you have created these six new policies, your policy list page should look like the following:

   ![Screenshot 2025-06-11 at 4 01 34 PM](https://github.com/user-attachments/assets/7a8533dc-1c20-4b9b-9edd-cc1d5ea515c2)

  **Important:** Ensure all your policies have a status of `Enabled`.

### Create Catalog Views

1. In the Commerce Optimizer interface, navigate to **Catalog > Views**.

1. Create three catalog views that use your newly created policies.

   - Click **Add Catalog View**.
   - Add the following details:
     Name: `Global`
     Catalog Sources: `en-US` (make sure you hit **enter** button after typing in this value)
     Policies: `Brand`, `Model`, `West Coast Inc brands`

     The modal should look like the screenshot below.

     ![Screenshot 2025-06-11 at 4 15 19 PM](https://github.com/user-attachments/assets/23267d3b-390a-42d9-890f-d8d9de2013f5)

   - Click **Save**.

   Repeat the above steps to create two more catalog views. Use the following details:

   | Name  | Catalog Sources | Policies |
   | ------------- | ------------- | ------------- |
   | Arkbridge  | en-US  | `Brand` `Model` `West Coast Inc brands` `Arkbridge part categories`|
   | Kingsbluff  | en-US  | `Brand` `Model` `East Coast Inc brands` `Kingsbluff part categories`|

 At this point you have created three catalog views and six policies. You are now ready to complete the [tutorial](https://experienceleague.adobe.com/en/docs/commerce/optimizer/use-case/admin-use-case)
 to see how the sample data, catalog views, and policy configuration work together with your storefront.

## Explore the SDK

### Client

To get started with the Adobe Commerce Optimizer SDK, you first need to create the client. In order to do
this, use the `createClient` function provided in the `@adobe-commerce/aco-ts-sdk` package. The `createClient` function
accepts a client configuration object of type `ClientConfig`. The `ClientConfig` object requires the following:

- `credentials`: The credentials object contains the IMS fields needed to authenticate with the ACO APIs
  - `clientId`: This is your client id found in the Adobe Developer Console.
  - `clientSecret`: This is your client secret found in the Adobe Developer Console.
- `tenantId`: This is the identifier for your ACO instance.
- `region`: This is the region in which your ACO instance is deployed. Example: `na1`.
- `environment`: This is your ACO instance's environment type: `sandbox` or `production`

```typescript
import {
  createClient,
  consoleLogger,
  Client,
  ClientConfig,
  Environment,
  LogLevel,
  Region,
} from "@adobe-commerce/aco-ts-sdk";

// Define your configuration
const config: ClientConfig = {
  credentials: {
    clientId: "my-client-id", // Your IMS client id from Dev Console
    clientSecret: "my-client-secret", // Your IMS client secret from Dev Console
  },
  tenantId: "my-tenant-id", // Your instance's tenant id found in Commerce Cloud Manager UI
  region: "na1" as Region, // Your instance's region found in Commerce Cloud Manager UI
  environment: "sandbox" as Environment, // Your instance's environment type: sandbox or production
  timeoutMs: 30000, // Optional. HTTP timeout override in ms. Default is 10000ms
  logger: consoleLogger(LogLevel.DEBUG), // Optional. Pass in your existing logger. If not provided, a default console logger is used. See Types -> Logger section below.
};

// Initialize the client instance
const client: Client = createClient(config);
```

### Client Functions

Each entity provides a `create`, `update`, and `delete` function (ie. `createPriceBooks`). Using your Codespaces IDE, inspect each method and their parameter types to get a feel for the API.

Supported Entities:

- Products
- Product Metadata
- Price Books
- Prices

### Product Operations

#### Create Products

```typescript
import {
  FeedProduct,
  FeedProductStatusEnum,
  FeedProductVisibleInEnum,
} from "@adobe-commerce/aco-ts-sdk";

const product1: FeedProduct = {
  sku: "EXAMPLE-SKU-001",
  source: { locale: "en-US" },
  name: "Example Product 1",
  slug: "example-product-1",
  description: "This is an example product created via the SDK",
  status: FeedProductStatusEnum.Enabled,
  visibleIn: [
    FeedProductVisibleInEnum.Catalog,
    FeedProductVisibleInEnum.Search,
  ],
  attributes: [
    {
      code: "brand",
      values: ["Example Brand"],
    },
  ],
};

const product2: FeedProduct = {
  sku: "EXAMPLE-SKU-002",
  source: { locale: "en-US" },
  name: "Example Product 2",
  slug: "example-product-2",
  description: "This is another example product created via the SDK",
  status: FeedProductStatusEnum.Enabled,
  visibleIn: [
    FeedProductVisibleInEnum.Catalog,
    FeedProductVisibleInEnum.Search,
  ],
  attributes: [
    {
      code: "brand",
      values: ["Example Brand"],
    },
  ],
};

const response = await client.createProducts([product1, product2]);
// response.data: { status: 'ACCEPTED', acceptedCount: 2 }
```

#### Update Products

```typescript
import { FeedProductUpdate } from "@adobe-commerce/aco-ts-sdk";

const productUpdate: FeedProductUpdate = {
  sku: "EXAMPLE-SKU-001",
  source: { locale: "en-US" },
  name: "Updated Product Name",
};

const response = await client.updateProducts([productUpdate]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Delete Products

```typescript
import { FeedProductDelete } from "@adobe-commerce/aco-ts-sdk";

const productDelete: FeedProductDelete = {
  sku: "EXAMPLE-SKU-001",
  source: { locale: "en-US" },
};

const response = await client.deleteProducts([productDelete]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

### Product Metadata Operations

#### Create Product Metadata

```typescript
import {
  FeedMetadata,
  FeedMetadataDataTypeEnum,
  FeedMetadataVisibleInEnum,
} from "@adobe-commerce/aco-ts-sdk";

const metadata: FeedMetadata = {
  code: "color",
  source: { locale: "en-US" },
  label: "Color",
  dataType: FeedMetadataDataTypeEnum.Text,
  visibleIn: [FeedMetadataVisibleInEnum.ProductDetail],
  filterable: true,
  sortable: true,
  searchable: true,
};

const response = await client.createProductMetadata([metadata]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Update Product Metadata

```typescript
import { FeedMetadataUpdate } from "@adobe-commerce/aco-ts-sdk";

const metadataUpdate: FeedMetadataUpdate = {
  code: "color",
  source: { locale: "en-US" },
  label: "Updated Color Label",
};

const response = await client.updateProductMetadata([metadataUpdate]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Delete Product Metadata

```typescript
import { FeedMetadataDelete } from "@adobe-commerce/aco-ts-sdk";

const metadataDelete: FeedMetadataDelete = {
  code: "color",
  source: { locale: "en-US" },
};

const response = await client.deleteProductMetadata([metadataDelete]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

### Price Book Operations

#### Create Price Books

```typescript
import { FeedPricebook } from "@adobe-commerce/aco-ts-sdk";

const pricebook: FeedPricebook = {
  priceBookId: "default",
  name: "Default Price Book",
  currency: "USD",
};

const response = await client.createPriceBooks([pricebook]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Update Price Books

```typescript
import { FeedPricebook } from "./src/types";

const pricebookUpdate: FeedPricebook = {
  priceBookId: "default",
  name: "Updated Price Book Name",
};

const response = await client.updatePriceBooks([pricebookUpdate]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Delete Price Books

```typescript
import { FeedPricebook } from "@adobe-commerce/aco-ts-sdk";

const pricebookDelete: FeedPricebook = {
  priceBookId: "default",
};

const response = await client.deletePriceBooks([pricebookDelete]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

### Price Operations

#### Create Prices

```typescript
import { FeedPrices } from "@adobe-commerce/aco-ts-sdk";

const price: FeedPrices = {
  sku: "EXAMPLE-SKU-001",
  priceBookId: "default",
  regular: 99.99,
};

const response = await client.createPrices([price]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Update Prices

```typescript
import { FeedPricesUpdate } from "@adobe-commerce/aco-ts-sdk";

const priceUpdate: FeedPricesUpdate = {
  sku: "EXAMPLE-SKU-001",
  priceBookId: "default",
  regular: 99.99,
};

const response = await client.updatePrices([priceUpdate]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

#### Delete Prices

```typescript
import { FeedPricesDelete } from "@adobe-commerce/aco-ts-sdk";

const priceDelete: FeedPricesDelete = {
  sku: "EXAMPLE-SKU-001",
  priceBookId: "default",
};

const response = await client.deletePrices([priceDelete]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```

## Types

See the [types.ts](https://github.com/adobe-commerce/aco-ts-sdk/blob/main/src/types.ts) file for all exported type
definitions.

### Client Config

The `ClientConfig` object is required to be passed into the `createClient` function. It configures how the SDK client
will interact with Adobe Commerce Optimizer services.

```typescript
/**
 * Client configuration
 *
 * @param credentials - Adobe IMS credentials for authentication
 * @param tenantId - The tenant ID for the API requests
 * @param region - The region for the API endpoint (e.g., 'us', 'eu')
 * @param environment - The environment to use ('production' or 'sandbox')
 * @param timeoutMs - The timeout for the API requests
 * @param logger - Optional logger for customizing logging behavior
 */
export interface ClientConfig {
  credentials: AdobeCredentials;
  tenantId: string;
  region: Region;
  environment: Environment;
  timeoutMs?: number;
  logger?: Logger;
}
```

### Logger

The Adobe Commerce Optimizer SDK provides flexible logging capabilities through the `Logger` interface. You can either
use the default console logger or implement your own logger that matches the interface.

#### Default Logger

The default console logger that can be used like this:

```typescript
import { consoleLogger, LogLevel } from "@adobe-commerce/aco-ts-sdk";

const config: ClientConfig = {
  // ... other config options ...
  logger: consoleLogger(LogLevel.INFO), // Uses default console logger
};
```

#### Custom Logger

You can implement your own logger by creating an object that implements the `Logger` interface. This is useful for
integrating with your existing logging infrastructure and customizing log formats.

```typescript
/**
 * Logger interface for customizing logging behavior
 *
 * @param debug - Log a debug message
 * @param info - Log an info message
 * @param warn - Log a warning message
 * @param error - Log an error message
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Log level
 *
 * @param DEBUG - Debug log level
 * @param INFO - Info log level
 * @param WARN - Warning log level
 * @param ERROR - Error log level
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}
```

##### Using Winston

The [Winston Logger](https://github.com/winstonjs/winston) interface matches the SDK's `Logger` interface and is a
drop-in logger override.

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});
// ...
const config: ClientConfig = {
  // ... other config options ...
  logger, // Uses winston logger from your application
};
```

##### Using Pino

The [Pino Logger](https://getpino.io) interface does not exactly match the SDK's `Logger` interface, but can be easily
adapted to be provided as a logger override.

```typescript
import pino from "pino";

// Create a simple adaptor for the Pino logger interface
const createPinoAdapter = (pinoInstance) => {
  const logWithMetadata = (level, message, ...args) => {
    const metadata = args[0];
    if (metadata && typeof metadata === "object" && metadata !== null) {
      pinoInstance[level](metadata, message);
    } else {
      pinoInstance[level](message, ...args);
    }
  };

  return {
    debug: (message, ...args) => logWithMetadata("debug", message, ...args),
    info: (message, ...args) => logWithMetadata("info", message, ...args),
    warn: (message, ...args) => logWithMetadata("warn", message, ...args),
    error: (message, error, ...args) => {
      if (error instanceof Error) {
        const metadata = args[0];
        if (metadata && typeof metadata === "object" && metadata !== null) {
          pinoInstance.error({ ...metadata, err: error }, message);
        } else {
          pinoInstance.error({ err: error }, message);
        }
      } else if (error && typeof error === "object") {
        pinoInstance.error(error, message);
      } else {
        pinoInstance.error(message);
      }
    },
  };
};
const logger = createPinoAdapter(pino({ level: "debug" }));
// ...
const config: ClientConfig = {
  // ... other config options ...
  logger, // Uses pino logger from your application
};
```

