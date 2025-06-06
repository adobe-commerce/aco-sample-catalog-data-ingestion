# Adobe Commerce Optimizer - Sample catalog data ingestion

Adobe Commerce Optimizer has a sample data set which emulates the catalog data for an B2B2X Automobile manufacturer. The fictional Automobile conglomerate is called Carvelo. You will need to undertake this catalog data load to execute the tutorial [here](https://experienceleague.adobe.com/en/docs/commerce/optimizer/use-case/admin-use-case)

This repository will help you execute the catalog data ingestion into your ACO instance. Internally, a devSDK is used to execute these requests. Please reach out to your account manager to know more about getting access to these devSDKs.

**Important:** This repository helps you with the catalog data ingestion, this does not create the Channel and Policies called out in the [tutorial](https://experienceleague.adobe.com/en/docs/commerce/optimizer/use-case/admin-use-case). In your early access on-boarding email you would have received steps on creating these Channels and Policies. Please create them using the ACO UI.

## What Will We Do?

You will ingest `Product Metadata`, `Product`, `Price Book`, and `Price` data for our Carvelo Automotive demo dataset.

Using our new Adobe Commerce Optimizer Typescript/Javascript SDK, we will ingest:

- Metadata for our Product attributes
- 1080 Products across our 3 brands (in batches of 100)
- 5 unique Price Books
- 6480 Prices across our 5 Price Books (in batches of 100)

## Run the Data Ingestion Demo

### Configure .env

In order to ingest our new data, we first need to configure our Codespaces environment with our credentials and Adobe Commerce Optimizer instance information. This configuration will be used to instantiate the SDK client and allow us to securely interact with the Adobe Commerce Optimizer APIs.

Open the `.env` file and add our IMS client id and client secret crendentials.
The `CLIENT_ID` and `CLIENT_SECRET` values can be found in your early access on-boarding email. 

```conf
CLIENT_ID=my-client-id
CLIENT_SECRET=my-client-secret
```

Next, let's configure our instance information. The region and environment type have already been populated for us.
Your unique `TENANT_ID` can be found in the early access on-boarding email.

```conf
TENANT_ID=my-instance-id
REGION=na1
ENVIRONMENT=sandbox
```

### Start the Data Ingestion!

```shell
node index.js
```

## Check the API Documentation

[Adobe Developer Docs - API Reference](https://developer-stage.adobe.com/commerce/services/composable-catalog/data-ingestion/api-reference/)

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
  Client,
  ClientConfig,
  Environment,
  Region,
} from "@adobe-commerce/aco-ts-sdk";

// Define your configuration
const config: ClientConfig = {
  credentials: {
    clientId: "my-client-id",
    clientSecret: "my-client-secret",
  },
  tenantId: "my-tenant-id",
  region: "na1" as Region,
  environment: "sandbox" as Environment,
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
  ProductAttributeTypeEnum,
} from "@adobe-commerce/aco-ts-sdk";

const product1: FeedProduct = {
  sku: "EXAMPLE-SKU-001",
  scope: { locale: "en-US" },
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
      type: ProductAttributeTypeEnum.String,
      values: ["Example Brand"],
    },
  ],
};

const product2: FeedProduct = {
  sku: "EXAMPLE-SKU-002",
  scope: { locale: "en-US" },
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
      type: ProductAttributeTypeEnum.String,
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
  scope: { locale: "en-US" },
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
  scope: { locale: "en-US" },
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
  scope: { locale: "en-US" },
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
  scope: { locale: "en-US" },
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
  scope: { locale: "en-US" },
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
  regular: 84.49,
};

const response = await client.deletePrices([priceDelete]);
// response.data: { status: 'ACCEPTED', acceptedCount: 1 }
```
