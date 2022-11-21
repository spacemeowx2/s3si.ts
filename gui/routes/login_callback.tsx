import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { waiting } from './api/login_iksm.ts';

interface Data {
  token: string;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    // '?url='
    const url = decodeURIComponent(new URL(req.url).search.substring(5))
    waiting?.res(url);
    const token = await waiting?.token
    if (!token) {
      throw new Error('Failed to get token: Not login before')
    }
    return ctx.render({ token })
  }
}

export default function LoginCallback({ data: { token } }: PageProps<Data>) {
  return (
    <>
      <Head>
        <title>s3si.ts</title>
      </Head>
      Your are login. Your token is {token}
    </>
  );
}
