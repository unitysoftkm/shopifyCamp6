/** @typedef {import("@remix-run/node").ActionArgs} ActionArgs */

import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
    Card,
    Layout,
    Page,
    Text,
    TextField,
    VerticalStack,
    PageActions,
} from "@shopify/polaris";
import {
    useActionData,
    useLoaderData,
    useNavigation,
    useSubmit,
    useNavigate,
  } from "@remix-run/react";
import { useState } from "react";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  return json({
  message:"loader処理終了",
  });
}

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
  
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `
    query {
      shop {
        myshopifyDomain
      }
    }`
);

const responseJson = await response.json();

  // var Multipassify = require('multipassify');
  var Multipassify = require('multipassify');

  // Construct the Multipassify encoder
  var multipassify = new Multipassify(data.secretKey);

  // Create your customer data hash
  var customerData = { email: data.mailAddress, remote_ip:null, return_to:null};

  // Encode a Multipass token
  var token = multipassify.encode(customerData);

  // Generate a Shopify multipass URL to your shop
  var url = multipassify.generateUrl(customerData, responseJson.data.shop.myshopifyDomain);

  // Generates a URL like:  https://yourstorename.myshopify.com/account/login/multipass/<MULTIPASS-TOKEN>

  return json({
      url:url,
      token:token,
      mailAddress:data.mailAddress,
  });
}
export default function test8() {
    const errors = useActionData()?.errors || {};
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const navigate = useNavigate();
    const data = {
        mailAddress:"",
        secretKey:"",
    }
    const [formState, setFormState] = useState(data);
    const [cleanFormState, setCleanFormState] = useState(data);
    const submit = useSubmit();
    const nav = useNavigation();
    const isSaving = nav.state === "submitting" && nav.formMethod === "POST";
    const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

    function handleSave() {
        //リダイレクトを行う
        const data = {
            mailAddress: formState.mailAddress,
            secretKey: formState.secretKey,
        };
    
        setCleanFormState({ ...formState });
        submit(data, { method: "post" });
    }

    return (
        <Page>
        <ui-title-bar title={"multiPassApp"}>
        </ui-title-bar>
        <Layout>
          <Layout.Section>
            <VerticalStack gap="5">
              <Card>
                <VerticalStack gap="5">
                  <Text as={"h2"} variant="headingLg">
                  secretKey
                  </Text>
                  <TextField
                    id="secretKey"
                    helpText="secretKeyを入力　（secretKey表示方法：ストア管理画面→設定→お客様アカウント→マルチパスをオンにする）"
                    label="secretKey"
                    labelHidden
                    autoComplete="off"
                    value={formState.secretKey}
                    onChange={(secretKey) =>
                      setFormState({ ...formState, secretKey: secretKey })
                    }
                    error={errors.title}
                  />
                  <Text as={"h2"} variant="headingLg">
                  mailAddress
                  </Text>
                  <TextField
                    id="mailAddress"
                    helpText="mailAddressを入力"
                    label="mailAddress"
                    labelHidden
                    autoComplete="off"
                    value={formState.mailAddress}
                    onChange={(mailAddress) =>
                      setFormState({ ...formState, mailAddress: mailAddress })
                    }
                    error={errors.title}
                  />
                  <Text as={"h2"} variant="headingLg">
                  遷移URL
                  </Text>
                  <Text as={"p"} variant="bodySm">
                  {actionData ? actionData.url: "---"}
                  </Text>
                </VerticalStack>
              </Card>
            </VerticalStack>
          </Layout.Section>
          <Layout.Section>
            <PageActions
              primaryAction={{
                content: "shopifyログインURL表示",
                loading: isSaving,
                disabled: !isDirty || isSaving,
                onAction: handleSave,
              }}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }