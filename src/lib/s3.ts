import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = (process.env.Region || process.env.AWS_REGION || "us-east-1").trim();
const accessKeyId = (process.env.ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "").trim();
const secretAccessKey = (process.env.Secret_access_key || process.env.AWS_SECRET_ACCESS_KEY || "").trim();
const bucketName = (process.env.Bucket_Name || process.env.AWS_BUCKET_NAME || "mindfully-083400432789-us-east-1-an").trim();

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Uploads a File or Buffer to S3.
 * Returns the path formatted for DB storage: `/${folder}/${filename}` (e.g., `/uploads/filename.png`)
 * The file is stored in S3 at `${folder}/${filename}` which maps to `https://${Cloudfront_URL}/${folder}/${filename}`
 */
export async function uploadToS3(
  fileOrBuffer: File | Buffer,
  filename: string,
  folder: string = "uploads"
): Promise<string> {
  let bodyBuffer: Buffer;
  let contentType: string | undefined;

  if (Buffer.isBuffer(fileOrBuffer)) {
    bodyBuffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof fileOrBuffer === "object" && "arrayBuffer" in fileOrBuffer) {
    const arrayBuffer = await fileOrBuffer.arrayBuffer();
    bodyBuffer = Buffer.from(arrayBuffer);
    contentType = (fileOrBuffer as File).type;
  } else {
    throw new Error("Invalid file object provided for upload");
  }

  // Key in S3 bucket without leading slash
  const key = `${folder}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: bodyBuffer,
    ContentType: contentType || undefined,
  });

  await s3Client.send(command);

  return `/${folder}/${filename}`;
}
