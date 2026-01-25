FROM denoland/deno:2.6.6

WORKDIR /app

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
COPY deno.json deno.lock deps.ts dev_deps.ts ./
RUN deno cache --lock=deno.lock deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD . .
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache --lock=deno.lock s3si.ts

CMD ["run", "-A", "s3si.ts", "-n"]
