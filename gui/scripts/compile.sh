TARGETS="x86_64-unknown-linux-gnu,x86_64-pc-windows-msvc,x86_64-apple-darwin,aarch64-apple-darwin"

# compile for every target in bash
for target in $(echo $TARGETS | sed "s/,/ /g")
do
    deno compile --target=$target -o ./binaries/s3si-$target ../s3si.ts
done
