// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// commands.js or your custom support file
import { defaultErrorHandler, getValueByKey } from "../e2e/PaymentUtils/Utils";
import * as RequestBodyUtils from "../utils/RequestBodyUtils";
import { handleRedirection } from "./redirectionHandler";

function logRequestId(xRequestId) {
  if (xRequestId) {
    cy.task("cli_log", "x-request-id -> " + xRequestId);
  } else {
    cy.task("cli_log", "x-request-id is not available in the response headers");
  }
}

Cypress.Commands.add(
  "merchantCreateCallTest",
  (merchantCreateBody, globalState) => {
    const randomMerchantId = RequestBodyUtils.generateRandomString();
    RequestBodyUtils.setMerchantId(merchantCreateBody, randomMerchantId);
    globalState.set("merchantId", randomMerchantId);

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/accounts`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": globalState.get("adminApiKey"),
      },
      body: merchantCreateBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      // Handle the response as needed
      globalState.set("publishableKey", response.body.publishable_key);
      globalState.set("merchantDetails", response.body.merchant_details);
    });
  }
);

Cypress.Commands.add("merchantRetrieveCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/accounts/${merchant_id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.merchant_id).to.equal(merchant_id);
    expect(response.body.payment_response_hash_key).to.not.be.empty;
    expect(response.body.publishable_key).to.not.be.empty;
    expect(response.body.default_profile).to.not.be.empty;
    expect(response.body.organization_id).to.not.be.empty;
    globalState.set("organizationId", response.body.organization_id);
  });
});

Cypress.Commands.add("merchantDeleteCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  cy.request({
    method: "DELETE",
    url: `${globalState.get("baseUrl")}/accounts/${merchant_id}`,
    headers: {
      Accept: "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.body.merchant_id).to.equal(merchant_id);
    expect(response.body.deleted).to.equal(true);
  });
});

Cypress.Commands.add("merchantListCall", (globalState) => {
  const organization_id = globalState.get("organizationId");

  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/accounts/list?organization_id=${organization_id}`,
    headers: {
      Accept: "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.headers["content-type"]).to.include("application/json");
    for (const key in response.body) {
      expect(response.body[key]).to.have.property("merchant_id").and.not.empty;
      expect(response.body[key]).to.have.property("organization_id").and.not
        .empty;
      expect(response.body[key]).to.have.property("default_profile").and.not
        .empty;
    }
  });
});

Cypress.Commands.add(
  "merchantUpdateCall",
  (merchantUpdateBody, globalState) => {
    const merchant_id = globalState.get("merchantId");
    const organization_id = globalState.get("organizationId");
    const publishable_key = globalState.get("publishableKey");
    const merchant_details = globalState.get("merchantDetails");

    merchantUpdateBody.merchant_id = merchant_id;
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/accounts/${merchant_id}`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": globalState.get("adminApiKey"),
      },
      body: merchantUpdateBody,
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      expect(response.body.merchant_id).to.equal(merchant_id);
      expect(response.body.publishable_key).to.equal(publishable_key);
      expect(response.body.organization_id).to.equal(organization_id);
      expect(response.body.merchant_details).to.not.equal(merchant_details);
    });
  }
);

Cypress.Commands.add("apiKeyCreateTest", (apiKeyCreateBody, globalState) => {
  cy.request({
    method: "POST",
    url: `${globalState.get("baseUrl")}/api_keys/${globalState.get("merchantId")}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    body: apiKeyCreateBody,
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    // Handle the response as needed
    globalState.set("apiKey", response.body.api_key);
    globalState.set("apiKeyId", response.body.key_id);
  });
});

Cypress.Commands.add("apiKeyUpdateCall", (apiKeyUpdateBody, globalState) => {
  const merchant_id = globalState.get("merchantId");
  const api_key_id = globalState.get("apiKeyId");

  cy.request({
    method: "POST",
    url: `${globalState.get("baseUrl")}/api_keys/${merchant_id}/${api_key_id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    body: apiKeyUpdateBody,
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    // Handle the response as needed
    expect(response.body.name).to.equal("Updated API Key");
    expect(response.body.key_id).to.equal(api_key_id);
    expect(response.body.merchant_id).to.equal(merchant_id);
  });
});

Cypress.Commands.add("apiKeyRetrieveCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  const api_key_id = globalState.get("apiKeyId");

  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/api_keys/${merchant_id}/${api_key_id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.name).to.equal("Updated API Key");
    expect(response.body.key_id).to.equal(api_key_id);
    expect(response.body.merchant_id).to.equal(merchant_id);
  });
});

Cypress.Commands.add("apiKeyListCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");

  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/api_keys/${merchant_id}/list`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body).to.be.an("array").and.not.empty;
    for (const key in response.body) {
      expect(response.body[key]).to.have.property("name").and.not.empty;
      expect(response.body[key]).to.have.property("key_id").include("snd_").and
        .not.empty;
      expect(response.body[key].merchant_id).to.equal(merchant_id);
    }
  });
});

Cypress.Commands.add("apiKeyDeleteCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  const api_key_id = globalState.get("apiKeyId");

  cy.request({
    method: "DELETE",
    url: `${globalState.get("baseUrl")}/api_keys/${merchant_id}/${api_key_id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.merchant_id).to.equal(merchant_id);
    expect(response.body.key_id).to.equal(api_key_id);
    expect(response.body.revoked).to.equal(true);
  });
});

Cypress.Commands.add(
  "createNamedConnectorCallTest",
  (
    connectorType,
    createConnectorBody,
    payment_methods_enabled,
    globalState,
    connectorName,
    connectorLabel
  ) => {
    const merchantId = globalState.get("merchantId");
    createConnectorBody.connector_type = connectorType;
    createConnectorBody.connector_name = connectorName;
    createConnectorBody.connector_label = connectorLabel;
    createConnectorBody.payment_methods_enabled = payment_methods_enabled;
    // readFile is used to read the contents of the file and it always returns a promise ([Object Object]) due to its asynchronous nature
    // it is best to use then() to handle the response within the same block of code
    cy.readFile(globalState.get("connectorAuthFilePath")).then(
      (jsonContent) => {
        const authDetails = getValueByKey(
          JSON.stringify(jsonContent),
          connectorName
        );
        createConnectorBody.connector_account_details =
          authDetails.connector_account_details;
        cy.request({
          method: "POST",
          url: `${globalState.get("baseUrl")}/account/${merchantId}/connectors`,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": globalState.get("adminApiKey"),
          },
          body: createConnectorBody,
          failOnStatusCode: false,
        }).then((response) => {
          logRequestId(response.headers["x-request-id"]);

          if (response.status === 200) {
            expect(connectorName).to.equal(response.body.connector_name);
            globalState.set(
              "merchantConnectorId",
              response.body.merchant_connector_id
            );
          } else {
            cy.task(
              "cli_log",
              "response status -> " + JSON.stringify(response.status)
            );

            throw new Error(
              `Connector Create Call Failed ${response.body.error.message}`
            );
          }
        });
      }
    );
  }
);

Cypress.Commands.add(
  "createConnectorCallTest",
  (
    connectorType,
    createConnectorBody,
    payment_methods_enabled,
    globalState
  ) => {
    const merchantId = globalState.get("merchantId");
    createConnectorBody.connector_type = connectorType;
    createConnectorBody.connector_name = globalState.get("connectorId");
    createConnectorBody.payment_methods_enabled = payment_methods_enabled;
    // readFile is used to read the contents of the file and it always returns a promise ([Object Object]) due to its asynchronous nature
    // it is best to use then() to handle the response within the same block of code
    cy.readFile(globalState.get("connectorAuthFilePath")).then(
      (jsonContent) => {
        const authDetails = getValueByKey(
          JSON.stringify(jsonContent),
          globalState.get("connectorId")
        );
        createConnectorBody.connector_account_details =
          authDetails.connector_account_details;

        if (authDetails && authDetails.metadata) {
          createConnectorBody.metadata = {
            ...createConnectorBody.metadata, // Preserve existing metadata fields
            ...authDetails.metadata, // Merge with authDetails.metadata
          };
        }

        cy.request({
          method: "POST",
          url: `${globalState.get("baseUrl")}/account/${merchantId}/connectors`,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": globalState.get("adminApiKey"),
          },
          body: createConnectorBody,
          failOnStatusCode: false,
        }).then((response) => {
          logRequestId(response.headers["x-request-id"]);

          if (response.status === 200) {
            expect(globalState.get("connectorId")).to.equal(
              response.body.connector_name
            );
            globalState.set(
              "merchantConnectorId",
              response.body.merchant_connector_id
            );
          } else {
            cy.task(
              "cli_log",
              "response status -> " + JSON.stringify(response.status)
            );

            throw new Error(
              `Connector Create Call Failed ${response.body.error.message}`
            );
          }
        });
      }
    );
  }
);

Cypress.Commands.add(
  "createPayoutConnectorCallTest",
  (connectorType, createConnectorBody, globalState) => {
    const merchantId = globalState.get("merchantId");
    let connectorName = globalState.get("connectorId");
    createConnectorBody.connector_type = connectorType;
    createConnectorBody.connector_name = connectorName;
    createConnectorBody.connector_type = "payout_processor";
    // readFile is used to read the contents of the file and it always returns a promise ([Object Object]) due to its asynchronous nature
    // it is best to use then() to handle the response within the same block of code
    cy.readFile(globalState.get("connectorAuthFilePath")).then(
      (jsonContent) => {
        let authDetails = getValueByKey(
          JSON.stringify(jsonContent),
          `${connectorName}_payout`
        );

        // If the connector does not have payout connector creds in creds file, set payoutsExecution to false
        if (authDetails === null) {
          globalState.set("payoutsExecution", false);
          return false;
        } else {
          globalState.set("payoutsExecution", true);
        }

        createConnectorBody.connector_account_details =
          authDetails.connector_account_details;

        if (authDetails && authDetails.metadata) {
          createConnectorBody.metadata = {
            ...createConnectorBody.metadata, // Preserve existing metadata fields
            ...authDetails.metadata, // Merge with authDetails.metadata
          };
        }

        cy.request({
          method: "POST",
          url: `${globalState.get("baseUrl")}/account/${merchantId}/connectors`,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "api-key": globalState.get("adminApiKey"),
          },
          body: createConnectorBody,
          failOnStatusCode: false,
        }).then((response) => {
          logRequestId(response.headers["x-request-id"]);

          if (response.status === 200) {
            expect(globalState.get("connectorId")).to.equal(
              response.body.connector_name
            );
            globalState.set(
              "merchantConnectorId",
              response.body.merchant_connector_id
            );
          } else {
            cy.task(
              "cli_log",
              "response status -> " + JSON.stringify(response.status)
            );

            throw new Error(
              `Connector Create Call Failed ${response.body.error.message}`
            );
          }
        });
      }
    );
  }
);

Cypress.Commands.add("connectorRetrieveCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  const connector_id = globalState.get("connectorId");
  const merchant_connector_id = globalState.get("merchantConnectorId");

  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/account/${merchant_id}/connectors/${merchant_connector_id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.connector_name).to.equal(connector_id);
    expect(response.body.merchant_connector_id).to.equal(merchant_connector_id);
  });
});

Cypress.Commands.add("connectorDeleteCall", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  const merchant_connector_id = globalState.get("merchantConnectorId");

  cy.request({
    method: "DELETE",
    url: `${globalState.get("baseUrl")}/account/${merchant_id}/connectors/${merchant_connector_id}`,
    headers: {
      Accept: "application/json",
      "api-key": globalState.get("adminApiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.body.merchant_id).to.equal(merchant_id);
    expect(response.body.merchant_connector_id).to.equal(merchant_connector_id);
    expect(response.body.deleted).to.equal(true);
  });
});

Cypress.Commands.add(
  "connectorUpdateCall",
  (connectorType, updateConnectorBody, globalState) => {
    const merchant_id = globalState.get("merchantId");
    const connector_id = globalState.get("connectorId");
    const merchant_connector_id = globalState.get("merchantConnectorId");
    updateConnectorBody.connector_type = connectorType;

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/account/${merchant_id}/connectors/${merchant_connector_id}`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      body: updateConnectorBody,
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      expect(response.body.connector_name).to.equal(connector_id);
      expect(response.body.merchant_connector_id).to.equal(
        merchant_connector_id
      );
      expect(response.body.connector_label).to.equal("updated_connector_label");
    });
  }
);

// Generic function to list all connectors
Cypress.Commands.add("connectorListByMid", (globalState) => {
  const merchant_id = globalState.get("merchantId");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/account/${merchant_id}/connectors`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body).to.be.an("array").and.not.empty;
  });
});

Cypress.Commands.add(
  "createCustomerCallTest",
  (customerCreateBody, globalState) => {
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/customers`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      body: customerCreateBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.body.customer_id).to.not.be.empty;
      globalState.set("customerId", response.body.customer_id);
    });
  }
);

Cypress.Commands.add("customerListCall", (globalState) => {
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/customers/list`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    for (const key in response.body) {
      expect(response.body[key]).to.not.be.empty;
    }
  });
});

Cypress.Commands.add("customerRetrieveCall", (globalState) => {
  const customer_id = globalState.get("customerId");

  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/customers/${customer_id}`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.body.customer_id).to.equal(customer_id).and.not.be.empty;
  });
});

Cypress.Commands.add(
  "customerUpdateCall",
  (customerUpdateBody, globalState) => {
    const customer_id = globalState.get("customerId");

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/customers/${customer_id}`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      body: customerUpdateBody,
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.body.customer_id).to.equal(customer_id);
    });
  }
);

Cypress.Commands.add("ephemeralGenerateCall", (globalState) => {
  const customer_id = globalState.get("customerId");
  const merchant_id = globalState.get("merchantId");

  cy.request({
    method: "POST",
    url: `${globalState.get("baseUrl")}/ephemeral_keys`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    body: { customer_id: customer_id },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.body.customer_id).to.equal(customer_id);
    expect(response.body.merchant_id).to.equal(merchant_id);
    expect(response.body.id).to.exist.and.not.be.empty;
    expect(response.body.secret).to.exist.and.not.be.empty;
  });
});

Cypress.Commands.add("customerDeleteCall", (globalState) => {
  const customer_id = globalState.get("customerId");

  cy.request({
    method: "DELETE",
    url: `${globalState.get("baseUrl")}/customers/${customer_id}`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.body.customer_id).to.equal(customer_id).and.not.be.empty;
    expect(response.body.customer_deleted).to.equal(true);
    expect(response.body.address_deleted).to.equal(true);
    expect(response.body.payment_methods_deleted).to.equal(true);
  });
});

Cypress.Commands.add(
  "paymentMethodListTestLessThanEqualToOnePaymentMethod",
  (res_data, globalState) => {
    cy.request({
      method: "GET",
      url: `${globalState.get("baseUrl")}/account/payment_methods?client_secret=${globalState.get("clientSecret")}`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        expect(response.body).to.have.property("currency");
        if (res_data["payment_methods"].length == 1) {
          function getPaymentMethodType(obj) {
            return obj["payment_methods"][0]["payment_method_types"][0][
              "payment_method_type"
            ];
          }
          expect(getPaymentMethodType(res_data)).to.equal(
            getPaymentMethodType(response.body)
          );
        } else {
          expect(0).to.equal(response.body["payment_methods"].length);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "paymentMethodListTestTwoConnectorsForOnePaymentMethodCredit",
  (res_data, globalState) => {
    cy.request({
      method: "GET",
      url: `${globalState.get("baseUrl")}/account/payment_methods?client_secret=${globalState.get("clientSecret")}`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        expect(response.body).to.have.property("currency");
        if (res_data["payment_methods"].length > 0) {
          function getPaymentMethodType(obj) {
            return obj["payment_methods"][0]["payment_method_types"][0][
              "card_networks"
            ][0]["eligible_connectors"]
              .slice()
              .sort();
          }
          let config_payment_method_type = getPaymentMethodType(res_data);
          let response_payment_method_type = getPaymentMethodType(
            response.body
          );
          for (let i = 0; i < response_payment_method_type.length; i++) {
            expect(config_payment_method_type[i]).to.equal(
              response_payment_method_type[i]
            );
          }
        } else {
          expect(0).to.equal(response.body["payment_methods"].length);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "createPaymentIntentTest",
  (
    request,
    req_data,
    res_data,
    authentication_type,
    capture_method,
    globalState
  ) => {
    if (
      !request ||
      typeof request !== "object" ||
      !req_data.currency ||
      !authentication_type
    ) {
      throw new Error(
        "Invalid parameters provided to createPaymentIntentTest command"
      );
    }
    request.currency = req_data.currency;
    request.authentication_type = authentication_type;
    request.capture_method = capture_method;
    request.setup_future_usage = req_data.setup_future_usage;
    request.customer_acceptance = req_data.customer_acceptance;
    request.customer_id = globalState.get("customerId");
    globalState.set("paymentAmount", request.amount);
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: request,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      expect(response.headers["content-type"]).to.include("application/json");

      if (res_data.status === 200) {
        expect(response.body).to.have.property("client_secret");
        const clientSecret = response.body.client_secret;
        globalState.set("clientSecret", clientSecret);
        globalState.set("paymentID", response.body.payment_id);
        cy.log(clientSecret);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
        expect(request.amount).to.equal(response.body.amount);
        expect(null).to.equal(response.body.amount_received);
        expect(request.amount).to.equal(response.body.amount_capturable);
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add("paymentMethodsCallTest", (globalState) => {
  const clientSecret = globalState.get("clientSecret");
  const paymentIntentID = clientSecret.split("_secret_")[0];

  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/account/payment_methods?client_secret=${clientSecret}`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("publishableKey"),
    },
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body).to.have.property("redirect_url");
    expect(response.body).to.have.property("payment_methods");
    globalState.set("paymentID", paymentIntentID);
    cy.log(response);
  });
});

Cypress.Commands.add(
  "createPaymentMethodTest",
  (globalState, req_data, res_data) => {
    req_data.customer_id = globalState.get("customerId");

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payment_methods`,
      body: req_data,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": globalState.get("apiKey"),
      },
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        expect(response.body).to.have.property("payment_method_id");
        expect(response.body).to.have.property("client_secret");
        globalState.set("paymentMethodId", response.body.payment_method_id);
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "confirmCallTest",
  (confirmBody, req_data, res_data, confirm, globalState) => {
    const paymentIntentID = globalState.get("paymentID");
    confirmBody.confirm = confirm;
    confirmBody.client_secret = globalState.get("clientSecret");
    for (const key in req_data) {
      confirmBody[key] = req_data[key];
    }
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${paymentIntentID}/confirm`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
      body: confirmBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        globalState.set("paymentID", paymentIntentID);
        if (response.body.capture_method === "automatic") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else if (response.body.capture_method === "manual") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else {
          throw new Error(
            `Invalid capture method ${response.body.capture_method}`
          );
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "confirmBankRedirectCallTest",
  (confirmBody, req_data, res_data, confirm, globalState) => {
    const paymentIntentId = globalState.get("paymentID");
    const connectorId = globalState.get("connectorId");
    for (const key in req_data) {
      confirmBody[key] = req_data[key];
    }
    confirmBody.confirm = confirm;
    confirmBody.client_secret = globalState.get("clientSecret");

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${paymentIntentId}/confirm`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
      body: confirmBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      if (response.status === 200) {
        expect(response.headers["content-type"]).to.include("application/json");
        globalState.set("paymentID", paymentIntentId);
        globalState.set("paymentMethodType", confirmBody.payment_method_type);

        switch (response.body.authentication_type) {
          case "three_ds":
            if (
              response.body.capture_method === "automatic" ||
              response.body.capture_method === "manual"
            ) {
              if (response.body.status !== "failed") {
                // we get many statuses here, hence this verification
                if (
                  connectorId === "adyen" &&
                  response.body.payment_method_type === "blik"
                ) {
                  expect(response.body)
                    .to.have.property("next_action")
                    .to.have.property("type")
                    .to.equal("wait_screen_information");
                } else {
                  expect(response.body)
                    .to.have.property("next_action")
                    .to.have.property("redirect_to_url");
                  globalState.set(
                    "nextActionUrl",
                    response.body.next_action.redirect_to_url
                  );
                }
              } else if (response.body.status === "failed") {
                expect(response.body.error_code).to.equal(
                  res_data.body.error_code
                );
              }
            } else {
              throw new Error(
                `Invalid capture method ${response.body.capture_method}`
              );
            }
            break;
          case "no_three_ds":
            if (
              response.body.capture_method === "automatic" ||
              response.body.capture_method === "manual"
            ) {
              expect(response.body)
                .to.have.property("next_action")
                .to.have.property("redirect_to_url");
              globalState.set(
                "nextActionUrl",
                response.body.next_action.redirect_to_url
              );
            } else {
              throw new Error(
                `Invalid capture method ${response.body.capture_method}`
              );
            }
            break;
          default:
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "confirmBankTransferCallTest",
  (confirmBody, req_data, res_data, confirm, globalState) => {
    const paymentIntentID = globalState.get("paymentID");
    for (const key in req_data) {
      confirmBody[key] = req_data[key];
    }
    confirmBody.confirm = confirm;
    confirmBody.client_secret = globalState.get("clientSecret");
    globalState.set("paymentMethodType", confirmBody.payment_method_type);

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${paymentIntentID}/confirm`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
      body: confirmBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        globalState.set("paymentID", paymentIntentID);
        if (
          response.body.capture_method === "automatic" ||
          response.body.capture_method === "manual"
        ) {
          switch (response.body.payment_method_type) {
            case "pix":
              expect(response.body)
                .to.have.property("next_action")
                .to.have.property("qr_code_url");
              if (response.body.next_action.qr_code_url !== null) {
                globalState.set(
                  "nextActionUrl", // This is intentionally kept as nextActionUrl to avoid issues during handleRedirection call,
                  response.body.next_action.qr_code_url
                );
                globalState.set("nextActionType", "qr_code_url");
              } else {
                globalState.set(
                  "nextActionUrl", // This is intentionally kept as nextActionUrl to avoid issues during handleRedirection call,
                  response.body.next_action.image_data_url
                );
                globalState.set("nextActionType", "image_data_url");
              }
              break;
            default:
              expect(response.body)
                .to.have.property("next_action")
                .to.have.property("redirect_to_url");
              globalState.set(
                "nextActionUrl",
                response.body.next_action.redirect_to_url
              );
              break;
          }
        } else {
          throw new Error(
            `Invalid capture method ${response.body.capture_method}`
          );
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "confirmUpiCall",
  (confirmBody, req_data, res_data, confirm, globalState) => {
    const paymentId = globalState.get("paymentID");
    for (const key in req_data) {
      confirmBody[key] = req_data[key];
    }
    confirmBody.confirm = confirm;
    confirmBody.client_secret = globalState.get("clientSecret");
    globalState.set("paymentMethodType", confirmBody.payment_method_type);

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${paymentId}/confirm`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
      body: confirmBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        if (
          response.body.capture_method === "automatic" ||
          response.body.capture_method === "manual"
        ) {
          if (response.body.payment_method_type === "upi_collect") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
          } else if (response.body.payment_method_type === "upi_intent") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("qr_code_fetch_url");
            globalState.set(
              "nextActionUrl",
              response.body.next_action.qr_code_fetch_url
            );
          }
        } else {
          throw new Error(
            `Invalid capture method ${response.body.capture_method}`
          );
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "createConfirmPaymentTest",
  (
    createConfirmPaymentBody,
    req_data,
    res_data,
    authentication_type,
    capture_method,
    globalState
  ) => {
    createConfirmPaymentBody.authentication_type = authentication_type;
    createConfirmPaymentBody.capture_method = capture_method;
    createConfirmPaymentBody.customer_id = globalState.get("customerId");
    for (const key in req_data) {
      createConfirmPaymentBody[key] = req_data[key];
    }
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: createConfirmPaymentBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        if (response.body.capture_method === "automatic") {
          expect(response.body).to.have.property("status");
          globalState.set("paymentAmount", createConfirmPaymentBody.amount);
          globalState.set("paymentID", response.body.payment_id);
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else {
            throw new Error(
              `Invalid authentication type: ${response.body.authentication_type}`
            );
          }
        } else if (response.body.capture_method === "manual") {
          expect(response.body).to.have.property("status");
          globalState.set("paymentAmount", createConfirmPaymentBody.amount);
          globalState.set("paymentID", response.body.payment_id);
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else {
            throw new Error(
              `Invalid authentication type: ${response.body.authentication_type}`
            );
          }
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

// This is consequent saved card payment confirm call test(Using payment token)
Cypress.Commands.add(
  "saveCardConfirmCallTest",
  (saveCardConfirmBody, req_data, res_data, globalState) => {
    const paymentIntentID = globalState.get("paymentID");
    if (req_data.setup_future_usage === "on_session") {
      saveCardConfirmBody.card_cvc = req_data.payment_method_data.card.card_cvc;
    }
    saveCardConfirmBody.payment_token = globalState.get("paymentToken");
    saveCardConfirmBody.client_secret = globalState.get("clientSecret");
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${paymentIntentID}/confirm`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("publishableKey"),
      },
      failOnStatusCode: false,
      body: saveCardConfirmBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        globalState.set("paymentID", paymentIntentID);
        if (response.body.capture_method === "automatic") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
            expect(response.body.customer_id).to.equal(
              globalState.get("customerId")
            );
          } else {
            // Handle other authentication types as needed
            throw new Error(
              `Invalid authentication type: ${response.body.authentication_type}`
            );
          }
        } else if (response.body.capture_method === "manual") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
            expect(response.body.customer_id).to.equal(
              globalState.get("customerId")
            );
          } else {
            // Handle other authentication types as needed
            throw new Error(
              `Invalid authentication type: ${response.body.authentication_type}`
            );
          }
        } else {
          // Handle other capture methods as needed
          throw new Error(
            `Invalid capture method: ${response.body.capture_method}`
          );
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "captureCallTest",
  (requestBody, req_data, res_data, amount_to_capture, globalState) => {
    const payment_id = globalState.get("paymentID");
    requestBody.amount_to_capture = amount_to_capture;
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${payment_id}/capture`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: requestBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      expect(response.headers["content-type"]).to.include("application/json");
      if (response.body.capture_method !== undefined) {
        expect(response.body.payment_id).to.equal(payment_id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "voidCallTest",
  (requestBody, req_data, res_data, globalState) => {
    const payment_id = globalState.get("paymentID");
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments/${payment_id}/cancel`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: requestBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add("retrievePaymentCallTest", (globalState) => {
  const payment_id = globalState.get("paymentID");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/payments/${payment_id}?force_sync=true`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.payment_id).to.equal(payment_id);
    expect(response.body.amount).to.equal(globalState.get("paymentAmount"));
    globalState.set("paymentID", response.body.payment_id);
  });
});

Cypress.Commands.add(
  "refundCallTest",
  (requestBody, req_data, res_data, refund_amount, globalState) => {
    const payment_id = globalState.get("paymentID");
    requestBody.payment_id = payment_id;
    requestBody.amount = refund_amount;
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/refunds`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: requestBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        globalState.set("refundId", response.body.refund_id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
        expect(response.body.payment_id).to.equal(payment_id);
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "syncRefundCallTest",
  (req_data, res_data, globalState) => {
    const refundId = globalState.get("refundId");
    cy.request({
      method: "GET",
      url: `${globalState.get("baseUrl")}/refunds/${refundId}`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);

      expect(response.headers["content-type"]).to.include("application/json");
      for (const key in res_data.body) {
        expect(res_data.body[key]).to.equal(response.body[key]);
      }
    });
  }
);

Cypress.Commands.add(
  "citForMandatesCallTest",
  (
    requestBody,
    req_data,
    res_data,
    amount,
    confirm,
    capture_method,
    payment_type,
    globalState
  ) => {
    for (const key in req_data) {
      requestBody[key] = req_data[key];
    }
    requestBody.payment_type = payment_type;
    requestBody.confirm = confirm;
    requestBody.amount = amount;
    requestBody.capture_method = capture_method;
    requestBody.customer_id = globalState.get("customerId");
    globalState.set("paymentAmount", requestBody.amount);
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: requestBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        globalState.set("paymentID", response.body.payment_id);

        if (requestBody.mandate_data === null) {
          expect(response.body).to.have.property("payment_method_id");
          globalState.set("paymentMethodId", response.body.payment_method_id);
        } else {
          expect(response.body).to.have.property("mandate_id");
          globalState.set("mandateId", response.body.mandate_id);
        }

        if (response.body.capture_method === "automatic") {
          expect(response.body).to.have.property("mandate_id");
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
            cy.log(nextActionUrl);
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else if (response.body.capture_method === "manual") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
            globalState.set(
              "nextActionUrl",
              response.body.next_action.redirect_to_url
            );
            cy.log(nextActionUrl);
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else if (response.body.authentication_type === "no_three_ds") {
            for (const key in res_data.body) {
              expect(res_data.body[key]).to.equal(response.body[key]);
            }
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else {
          throw new Error(
            `Invalid capture method ${response.body.capture_method}`
          );
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "mitForMandatesCallTest",
  (requestBody, amount, confirm, capture_method, globalState) => {
    requestBody.amount = amount;
    requestBody.confirm = confirm;
    requestBody.capture_method = capture_method;
    requestBody.mandate_id = globalState.get("mandateId");
    requestBody.customer_id = globalState.get("customerId");
    globalState.set("paymentAmount", requestBody.amount);
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: requestBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        globalState.set("paymentID", response.body.payment_id);
        if (response.body.capture_method === "automatic") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
            cy.log(nextActionUrl);
          } else if (response.body.authentication_type === "no_three_ds") {
            expect(response.body.status).to.equal("succeeded");
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else if (response.body.capture_method === "manual") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
            cy.log(nextActionUrl);
          } else if (response.body.authentication_type === "no_three_ds") {
            expect(response.body.status).to.equal("requires_capture");
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else {
          throw new Error(
            `Invalid capture method ${response.body.capture_method}`
          );
        }
      } else if (response.status === 400) {
        if (response.body.error.message === "Mandate Validation Failed") {
          expect(response.body.error.code).to.equal("HE_03");
          expect(response.body.error.message).to.equal(
            "Mandate Validation Failed"
          );
          expect(response.body.error.reason).to.equal(
            "request amount is greater than mandate amount"
          );
        }
      } else {
        throw new Error(
          `Error Response: ${response.status}\n${response.body.error.message}\n${response.body.error.code}`
        );
      }
    });
  }
);

Cypress.Commands.add(
  "mitUsingPMId",
  (requestBody, amount, confirm, capture_method, globalState) => {
    requestBody.amount = amount;
    requestBody.confirm = confirm;
    requestBody.capture_method = capture_method;
    requestBody.recurring_details.data = globalState.get("paymentMethodId");
    requestBody.customer_id = globalState.get("customerId");
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payments`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: requestBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");
      if (response.status === 200) {
        globalState.set("paymentID", response.body.payment_id);
        if (response.body.capture_method === "automatic") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
            cy.log(nextActionUrl);
          } else if (response.body.authentication_type === "no_three_ds") {
            expect(response.body.status).to.equal("succeeded");
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else if (response.body.capture_method === "manual") {
          if (response.body.authentication_type === "three_ds") {
            expect(response.body)
              .to.have.property("next_action")
              .to.have.property("redirect_to_url");
            const nextActionUrl = response.body.next_action.redirect_to_url;
            cy.log(nextActionUrl);
          } else if (response.body.authentication_type === "no_three_ds") {
            expect(response.body.status).to.equal("requires_capture");
          } else {
            throw new Error(
              `Invalid authentication type ${response.body.authentication_type}`
            );
          }
        } else {
          throw new Error(
            `Invalid capture method ${response.body.capture_method}`
          );
        }
      } else {
        throw new Error(
          `Error Response: ${response.status}\n${response.body.error.message}\n${response.body.error.code}`
        );
      }
    });
  }
);

Cypress.Commands.add("listMandateCallTest", (globalState) => {
  const customerId = globalState.get("customerId");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/customers/${customerId}/mandates`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");

    let i = 0;
    for (i in response.body) {
      if (response.body[i].mandate_id === globalState.get("mandateId")) {
        expect(response.body[i].status).to.equal("active");
      }
    }
  });
});

Cypress.Commands.add("revokeMandateCallTest", (globalState) => {
  const mandateId = globalState.get("mandateId");
  cy.request({
    method: "POST",
    url: `${globalState.get("baseUrl")}/mandates/revoke/${mandateId}`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    if (response.body.status === 200) {
      expect(response.body.status).to.equal("revoked");
    } else if (response.body.status === 400) {
      expect(response.body.reason).to.equal("Mandate has already been revoked");
    }
  });
});

Cypress.Commands.add(
  "handleRedirection",
  (globalState, expected_redirection) => {
    let connectorId = globalState.get("connectorId");
    let expected_url = new URL(expected_redirection);
    let redirection_url = new URL(globalState.get("nextActionUrl"));
    handleRedirection(
      "three_ds",
      { redirection_url, expected_url },
      connectorId,
      null
    );
  }
);

Cypress.Commands.add(
  "handleBankRedirectRedirection",
  (globalState, payment_method_type, expected_redirection) => {
    let connectorId = globalState.get("connectorId");
    let expected_url = new URL(expected_redirection);
    let redirection_url = new URL(globalState.get("nextActionUrl"));
    // explicitly restricting `sofort` payment method by adyen from running as it stops other tests from running
    // trying to handle that specific case results in stripe 3ds tests to fail
    if (!(connectorId == "adyen" && payment_method_type == "sofort")) {
      handleRedirection(
        "bank_redirect",
        { redirection_url, expected_url },
        connectorId,
        payment_method_type
      );
    }
  }
);

Cypress.Commands.add(
  "handleBankTransferRedirection",
  (globalState, payment_method_type, expected_redirection) => {
    let connectorId = globalState.get("connectorId");
    let expected_url = new URL(expected_redirection);
    let redirection_url = new URL(globalState.get("nextActionUrl"));
    let next_action_type = globalState.get("nextActionType");
    cy.log(payment_method_type);
    handleRedirection(
      "bank_transfer",
      { redirection_url, expected_url },
      connectorId,
      payment_method_type,
      { next_action_type }
    );
  }
);

Cypress.Commands.add(
  "handleUpiRedirection",
  (globalState, payment_method_type, expected_redirection) => {
    let connectorId = globalState.get("connectorId");
    let expected_url = new URL(expected_redirection);
    let redirection_url = new URL(globalState.get("nextActionUrl"));
    handleRedirection(
      "upi",
      { redirection_url, expected_url },
      connectorId,
      payment_method_type
    );
  }
);

Cypress.Commands.add("listCustomerPMCallTest", (globalState) => {
  const customerId = globalState.get("customerId");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/customers/${customerId}/payment_methods`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.headers["content-type"]).to.include("application/json");
    if (response.body.customer_payment_methods[0]?.payment_token) {
      const paymentToken =
        response.body.customer_payment_methods[0].payment_token;
      globalState.set("paymentToken", paymentToken); // Set paymentToken in globalState
    } else {
      // We only get an empty array if something's wrong. One exception is a 4xx when no customer exist but it is handled in the test
      expect(response.body)
        .to.have.property("customer_payment_methods")
        .to.be.an("array").and.empty;
    }
  });
});

Cypress.Commands.add("listRefundCallTest", (requestBody, globalState) => {
  cy.request({
    method: "POST",
    url: `${globalState.get("baseUrl")}/refunds/list`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    body: requestBody,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.data).to.be.an("array").and.not.empty;
  });
});

Cypress.Commands.add(
  "createConfirmPayoutTest",
  (
    createConfirmPayoutBody,
    req_data,
    res_data,
    confirm,
    auto_fulfill,
    globalState
  ) => {
    for (const key in req_data) {
      createConfirmPayoutBody[key] = req_data[key];
    }
    createConfirmPayoutBody.auto_fulfill = auto_fulfill;
    createConfirmPayoutBody.confirm = confirm;
    createConfirmPayoutBody.customer_id = globalState.get("customerId");

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payouts/create`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: createConfirmPayoutBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        globalState.set("payoutAmount", createConfirmPayoutBody.amount);
        globalState.set("payoutID", response.body.payout_id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "createConfirmWithTokenPayoutTest",
  (
    createConfirmPayoutBody,
    req_data,
    res_data,
    confirm,
    auto_fulfill,
    globalState
  ) => {
    for (const key in req_data) {
      createConfirmPayoutBody[key] = req_data[key];
    }
    createConfirmPayoutBody.customer_id = globalState.get("customerId");
    createConfirmPayoutBody.payout_token = globalState.get("paymentToken");
    createConfirmPayoutBody.auto_fulfill = auto_fulfill;
    createConfirmPayoutBody.confirm = confirm;

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payouts/create`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: createConfirmPayoutBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        globalState.set("payoutAmount", createConfirmPayoutBody.amount);
        globalState.set("payoutID", response.body.payout_id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "fulfillPayoutCallTest",
  (payoutFulfillBody, req_data, res_data, globalState) => {
    payoutFulfillBody.payout_id = globalState.get("payoutID");

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/payouts/${globalState.get("payoutID")}/fulfill`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: payoutFulfillBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "updatePayoutCallTest",
  (payoutConfirmBody, req_data, res_data, auto_fulfill, globalState) => {
    payoutConfirmBody.confirm = true;
    payoutConfirmBody.auto_fulfill = auto_fulfill;

    cy.request({
      method: "PUT",
      url: `${globalState.get("baseUrl")}/payouts/${globalState.get("payoutID")}`,
      headers: {
        "Content-Type": "application/json",
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
      body: payoutConfirmBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add("retrievePayoutCallTest", (globalState) => {
  const payout_id = globalState.get("payoutID");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/payouts/${payout_id}`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body.payout_id).to.equal(payout_id);
    expect(response.body.amount).to.equal(globalState.get("payoutAmount"));
  });
});

Cypress.Commands.add("createJWTToken", (req_data, res_data, globalState) => {
  const jwt_body = {
    email: `${globalState.get("email")}`,
    password: `${globalState.get("password")}`,
  };

  cy.request({
    method: "POST",
    url: `${globalState.get("baseUrl")}/user/v2/signin`,
    headers: {
      "Content-Type": "application/json",
    },
    failOnStatusCode: false,
    body: jwt_body,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);
    expect(response.headers["content-type"]).to.include("application/json");

    if (response.status === 200) {
      expect(response.body).to.have.property("token");
      //set jwt_token
      globalState.set("jwtToken", response.body.token);

      // set session cookie
      const sessionCookie = response.headers["set-cookie"][0];
      const sessionValue = sessionCookie.split(";")[0];
      globalState.set("cookie", sessionValue);

      // set api key
      globalState.set("apiKey", globalState.get("routingApiKey"));
      globalState.set("merchantId", response.body.merchant_id);

      for (const key in res_data.body) {
        expect(res_data.body[key]).to.equal(response.body[key]);
      }
    } else {
      defaultErrorHandler(response, res_data);
    }
  });
});

// Specific to routing tests
Cypress.Commands.add("ListMCAbyMID", (globalState) => {
  const merchantId = globalState.get("merchantId");
  cy.request({
    method: "GET",
    url: `${globalState.get("baseUrl")}/account/${merchantId}/connectors`,
    headers: {
      "Content-Type": "application/json",
      "api-key": globalState.get("apiKey"),
    },
    failOnStatusCode: false,
  }).then((response) => {
    logRequestId(response.headers["x-request-id"]);

    expect(response.headers["content-type"]).to.include("application/json");
    globalState.set("profileId", response.body[0].profile_id);
    globalState.set("stripeMcaId", response.body[0].merchant_connector_id);
    globalState.set("adyenMcaId", response.body[1].merchant_connector_id);
  });
});

Cypress.Commands.add(
  "addRoutingConfig",
  (routingBody, req_data, res_data, type, data, globalState) => {
    for (const key in req_data) {
      routingBody[key] = req_data[key];
    }
    // set profile id from env
    routingBody.profile_id = globalState.get("profileId");
    routingBody.algorithm.type = type;
    routingBody.algorithm.data = data;

    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/routing`,
      headers: {
        "Content-Type": "application/json",
        Cookie: `${globalState.get("cookie")}`,
        "api-key": `Bearer ${globalState.get("jwtToken")}`,
      },
      failOnStatusCode: false,
      body: routingBody,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        expect(response.body).to.have.property("id");
        globalState.set("routingConfigId", response.body.id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "activateRoutingConfig",
  (req_data, res_data, globalState) => {
    let routing_config_id = globalState.get("routingConfigId");
    cy.request({
      method: "POST",
      url: `${globalState.get("baseUrl")}/routing/${routing_config_id}/activate`,
      headers: {
        "Content-Type": "application/json",
        Cookie: `${globalState.get("cookie")}`,
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        expect(response.body.id).to.equal(routing_config_id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);

Cypress.Commands.add(
  "retrieveRoutingConfig",
  (req_data, res_data, globalState) => {
    let routing_config_id = globalState.get("routingConfigId");
    cy.request({
      method: "GET",
      url: `${globalState.get("baseUrl")}/routing/${routing_config_id}`,
      headers: {
        "Content-Type": "application/json",
        Cookie: `${globalState.get("cookie")}`,
        "api-key": globalState.get("apiKey"),
      },
      failOnStatusCode: false,
    }).then((response) => {
      logRequestId(response.headers["x-request-id"]);
      expect(response.headers["content-type"]).to.include("application/json");

      if (response.status === 200) {
        expect(response.body.id).to.equal(routing_config_id);
        for (const key in res_data.body) {
          expect(res_data.body[key]).to.equal(response.body[key]);
        }
      } else {
        defaultErrorHandler(response, res_data);
      }
    });
  }
);
