import { json, redirect } from "@remix-run/node";
import {
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  VerticalStack,
  Card,
  Button,
  HorizontalStack,
  Box,
  Divider,
  List,
  Link,
  PageActions,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return json({ shop: session.shop.replace(".myshopify.com", "") });
};


export
  /**
    * @param {request} ActionArgs
    * @returns {FunctionResult}
  */
  async function action({ request }) {
  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
  };
  const selectApp = data.selectApp;
  var movePass = "";
  if (selectApp === "fulfillmentApp") {
    movePass = "/app/fulfillment"
  }else if (selectApp === "multipassApp") {
    movePass = "/app/multipass"
  }
  return redirect(movePass);

}

export default function Index() {
  const submit = useSubmit();
  const data = {
    selectApp: "",
  };
  const [formState, setFormState] = useState(data);
  function moveFulfillmentApp() {
    const data = {
      selectApp: "fulfillmentApp",
    };
    submit(data, { method: "post" });
  }
  function moveMultipassApp() {
    const data = {
      selectApp: "multipassApp",
    };
    submit(data, { method: "post" });
  }

  return (
    <Page>
      <ui-title-bar title="成果物6">
      </ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <Card>
              <VerticalStack gap="5">
                <Text as="p" variant="headingMd">
                  fulfillmentApp
                </Text>
                <Text as="p" variant="bodySm" >
                  指定の注文を「未発送」から「発送済み」に変更します。
                </Text>
                <Text as="p" variant="bodySm" color="critical">
                  アプリ管理画面から「 顧客データへのアクセス許可」の設定が必要です。
                  <br />
                  「アプリ管理」→「アプリ名」→「APIアクセス」→
                  アクセス要求 保護された顧客データへのアクセス「アクセス権をリクエスト」or「管理」→
                  <br />
                  保護された顧客データ「選択」→理由を選択して「保存」
                </Text>
              </VerticalStack>
              <PageActions
                primaryAction={{
                  content: " fulfillmentApp",
                  onAction: moveFulfillmentApp
                }} />
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <VerticalStack gap="5">
                <Text as="p" variant="headingMd">
                multipassApp
                </Text>
                <Text as="p" variant="bodySm" >
                  シークレットキー、メールアドレスを元にshopifyストアに遷移するUrlを表示します。
                  <br/>
                  URL遷移時の動き
                  <br/>
                  shopifyに登録のないメールアドレスの場合は、新規顧客作成されたのちshopifyにログイン、shopify画面に遷移
                  <br/>
                  shopifyに登録されているメールアドレスの場合は、該当の顧客でshopifyにログイン、shopify画面に遷移
                </Text>
              </VerticalStack>
              <PageActions
                primaryAction={{
                  content: " multipassApp",
                  onAction: moveMultipassApp
                }} />
            </Card>
          </Layout.Section>
        </Layout>
      </VerticalStack>
    </Page>
  );
}
