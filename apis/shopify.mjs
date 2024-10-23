import axios from "axios";
import Bottleneck from "bottleneck";
const API_VERSION = "2024-10";
const shop = process.env.SHOPIFY_SHOP;
const token = process.env.SHOPIFY_ACCESS_TOKEN;

const limiter = new Bottleneck({
  minTime: 500, //2 requests per second
});

export async function getCustomers() {
  let url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;
  let pagesRemaining = true;
  let data = [];
  let cursor = null;

  while (pagesRemaining) {
    try {
      const response = await limiter.schedule(() =>
        axios(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
          data: {
            query: `{
						customers(first:250,${cursor ? `after:"${cursor}"` : ""}){
							nodes{
								id
								firstName
								lastName
								email
								phone
								defaultAddress{
									address1
									address2
									city
									phone
									countryCodeV2
								}
							}
						}
					}`,
          },
        }),
      );

      data = [...data, ...response.data.data.customers.nodes];
      pagesRemaining = response.data.data.customers.pageInfo.hasNextPage;

      if (pagesRemaining) {
        cursor = response.data.data.customers.pageInfo.endCursor;
      }
    } catch (error) {
      console.error("Error getting customers from Shopify: ", error);
      throw error;
    }
  }
  return data;
}

export async function getCustomer({ customerId }) {
  let url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;
  try {
    const response = await axios(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      data: {
        query: `{
                  customer(id:"${customerId}"){
                      email
                      phone
                  }
                }`,
      },
    });

    const { email, phone } = response.data.data.customer;

    return {
      contact: {
        email,
        mobile: phone,
      },
    };
  } catch (error) {
    console.error("Error getting customer from Shopify: ", error);
    throw error;
  }
}
