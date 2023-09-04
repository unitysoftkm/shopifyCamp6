/** @typedef {import("@remix-run/node").ActionArgs} ActionArgs */

import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  Card,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  VerticalStack,
  PageActions,
  IndexTable,
} from "@shopify/polaris";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { useState } from "react";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  //orderリスト取得　https://shopify.dev/docs/api/admin-graphql/2023-07/queries/order
  const orderList = await admin.graphql(
    `
    query {
      orders(first:20) {
        edges{
        	node{
            id
            name
            displayFulfillmentStatus
            fulfillmentOrders(first:10){
              edges{
                node{
                  id
                }
              }
        		}
          }
        }
      }
    }`,
    {
      variables: {},
    }
  );
  //orderListよりOrderIdを取得
  const orderListJson = await orderList.json();
  return json({
    orders: orderListJson.data.orders.edges,
  });
}

export /**
 * @param {request} ActionArgs
 * @returns {FunctionResult}
 */
async function action({ request, params }) {
  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
  };

  const { admin } = await authenticate.admin(request);

  //orderIdよりorder情報取得　https://shopify.dev/docs/api/admin-graphql/2023-07/queries/order

  const orderInfo = await admin.graphql(
    `
    query selectOrder($id: ID!){
        order(id: $id) {
        id
        name
        displayFulfillmentStatus
        
      fulfillmentOrders(first:1){
            edges{
              node{
                id
              }
            }
          }
      }
    }
`,
    {
      variables: {
        id: "gid://shopify/Order/" + data.orderId,
      },
    }
  );
  //order情報よりfulfilmentOrderIdを取得
  const orderInfoJson = await orderInfo.json();
  if (orderInfoJson.data.order.displayFulfillmentStatus !== "UNFULFILLED") {
    return json({
      message: "ステータスがUNFULFILLED以外であるため更新できません",
   });
  }
  const fulfillmentOrderId = orderInfoJson.data.order.fulfillmentOrders.edges[0].node.id;
  //fulfilmentOrderIdよりfulfillmentCreateV2を実行　https://shopify.dev/docs/api/admin-graphql/2023-07/mutations/fulfillmentCreateV2
  const response = await admin.graphql(
    `
    mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
      fulfillmentCreateV2(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        fulfillment: {
          lineItemsByFulfillmentOrder: {
            fulfillmentOrderId: fulfillmentOrderId
          },
        },
      },
    }
  );

  const responseJson = await response.json();
  return json({
     message: "処理終了" + "　id：" + data.orderId,
  });
}

export default function Test7() {
  const errors = useActionData()?.errors || {};
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const data = {
    orderId: "",
  };
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const submit = useSubmit();
  const nav = useNavigation();
  const isSaving = nav.state === "submitting" && nav.formMethod === "POST";
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  function handleSave() {
    const data = {
      orderId: formState.orderId,
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }
  return (
    <Page>
      <ui-title-bar title={"fulfilmentApp"}>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <VerticalStack gap="5">
            <Card>
              <VerticalStack gap="5">
                <Text as={"h2"} variant="headingLg">
                  orderId
                </Text>
                <Text as={"h2"} variant="bodyMd">
                  {actionData ? actionData.message : ""}
                </Text>
                <TextField
                  id="orderId"
                  helpText="orderIdを入力してください"
                  label="orderId"
                  labelHidden
                  autoComplete="off"
                  value={formState.orderId}
                  onChange={(orderId) =>
                    setFormState({ ...formState, orderId: orderId })
                  }
                  error={errors.title}
                />
              </VerticalStack>
              <PageActions
                primaryAction={{
                  content: "更新",
                  loading: isSaving,
                  disabled: !isDirty || isSaving,
                  onAction: handleSave,
                }}
              />
            </Card>
            <Card>
              <IndexTable
                itemCount={loaderData.orders.length}
                headings={[
                  { title: "id" },
                  { title: "name" },
                  { title: "displayFulfillmentStatus" },
                ]}
                selectable={false}
              >
                {loaderData.orders.map(({ node }) => {
                  return (
                    <IndexTable.Row id={node} key={node} position={node}>
                      <IndexTable.Cell>{node.id}</IndexTable.Cell>
                      <IndexTable.Cell>{node.name}</IndexTable.Cell>
                      <IndexTable.Cell>{node.displayFulfillmentStatus}</IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>
            </Card>
          </VerticalStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
