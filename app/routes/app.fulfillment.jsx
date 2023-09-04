/** @typedef {import("@remix-run/node").ActionArgs} ActionArgs */

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  Card,
  Layout,
  Page,
  Text,
  TextField,
  VerticalStack,
  PageActions,
  IndexTable,
  Button,
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
  //graphqlのレスポンス（orderList）をJsonに変換
  const orderListJson = await orderList.json();
  //order情報のリストをordersとしてreturn
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
  try {
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
    //graphqlのレスポンス（orderInfo）をJsonに変換
    const orderInfoJson = await orderInfo.json();

    // order情報が取得できない場合、エラーメッセージをreturn
    if (orderInfoJson.data.order == null) {
      return json({
        error: "1",
        errorMessage: "[orderId：" + data.orderId + "] の注文は存在しません\n",
      });
    }

    // order情報が取得できない場合、エラーメッセージをreturn
    if (orderInfoJson.data.order.displayFulfillmentStatus !== "UNFULFILLED") {
      return json({
        errorMessage: "「未発送」のorderIDを入力してください\n",
        errorDetail:
          " [orderId：" +
          data.orderId +
          "] のフルフィルメント状況は「" +
          translateDisplayFulfillmentStatus(
            orderInfoJson.data.order.displayFulfillmentStatus
          ) +
          "」です",
      });
    }

    //order情報よりfulfilmentOrderIdを取得
    const fulfillmentOrderId =
      orderInfoJson.data.order.fulfillmentOrders.edges[0].node.id;

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
              fulfillmentOrderId: fulfillmentOrderId,
            },
          },
        },
      }
    );
  } catch (e) {
    return json({
      errorMessage: "フルフィルメント状況の更新に失敗しました\n",
    });
  }

  // 正常終了のメッセージをreturn
  return json({
    message:
      "更新完了しました　" +
      "[orderId：" +
      getIdFromOrderId(data.orderId) +
      "]",
  });
}

//orderIdから一意の数値を取得できる
function getIdFromOrderId(orderId) {
  const orderIdPass = orderId.split("/");
  return orderIdPass[orderIdPass.length - 1];
}

// フルフィルメント状況を翻訳できる
function translateDisplayFulfillmentStatus(displayFulfillmentStatus) {
  switch (displayFulfillmentStatus) {
    case "FULFILLED":
      return "発送済";
    case "UNFULFILLED":
      return "未発送";
    case "ON_HOLD":
      return "保留";
    case "SCHEDULED":
      return "スケジュール済み";
    case "PARTIALLY_FULFILLED":
      return "一部発送済み";
    default:
      return displayFulfillmentStatus;
  }
}

export default function Test6() {
  const errors = useActionData()?.errors || {};
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const data = {
    orderId: "",
  };
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const [expanded, setExpanded] = useState(false);
  const submit = useSubmit();
  const nav = useNavigation();
  const isSaving = nav.state === "submitting" && nav.formMethod === "POST";
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  //　「更新」ボタン押下後のアクション
  function handleSave() {
    const data = {
      orderId: formState.orderId,
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
    scrollTo(0, 0);
  }

  //　注文一覧を返却できる
  function renderOrderList() {
    return (
      <IndexTable
        itemCount={loaderData.orders.length}
        headings={[
          { title: "orderId" },
          { title: "注文名" },
          { title: "フルフィルメント状況" },
        ]}
        selectable={false}
      >
        {loaderData.orders.map(({ node }) => {
          return (
            <IndexTable.Row id={node} key={node} position={node}>
              <IndexTable.Cell>{getIdFromOrderId(node.id)}</IndexTable.Cell>
              <IndexTable.Cell>{node.name}</IndexTable.Cell>
              <IndexTable.Cell>
                {translateDisplayFulfillmentStatus(
                  node.displayFulfillmentStatus
                )}
              </IndexTable.Cell>
            </IndexTable.Row>
          );
        })}
      </IndexTable>
    );
  }

  return (
    <Page>
      <ui-title-bar title={"fulfilmentApp"}></ui-title-bar>
      <Layout>
        <Layout.Section>
          <VerticalStack gap="5">
            <Card>
              <VerticalStack gap="5">
                <Text as={"h1"} variant="headingLg" fontWeight="bold">
                  注文のフルフィルメント状況を「未発送」から「発送済み」に更新します
                </Text>
                <Text as={"h2"} variant="headingMd" color="critical">
                  {actionData ? actionData.errorMessage : ""}
                  <br></br>
                  {actionData ? actionData.errorDetail : ""}
                </Text>
                <Text as={"h2"} variant="headingMd" color="success">
                  {actionData ? actionData.message : ""}
                </Text>
                <TextField
                  id="orderId"
                  helpText="※半角数字13桁"
                  label="orderIdを入力してください"
                  placeholder="例: 5414420775206"
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
              <Button
                plain
                size="large"
                disclosure={expanded ? "up" : "down"}
                onClick={() => {
                  setExpanded(!expanded);
                }}
              >
                {expanded ? "注文一覧を閉じる" : "注文一覧を開く"}
              </Button>
              {expanded ? renderOrderList() : ""}
            </Card>
          </VerticalStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
