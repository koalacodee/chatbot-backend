import 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: import('@fastify/cookie').CookieSerializeOptions,
    ): this;

    clearCookie(
      name: string,
      options?: import('@fastify/cookie').CookieSerializeOptions,
    ): this;
  }

  interface FastifyRequest {
    cookies: { [cookieName: string]: string };
  }
}
