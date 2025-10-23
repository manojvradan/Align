import boto3
from botocore.exceptions import ClientError
import logging
from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_s3_client():
    """Initializes and returns a Boto3 S3 client."""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )


def upload_file_to_s3(file_obj, object_name: str) -> str | None:
    """
    Upload a file to an S3 bucket and return its public URL.

    :param file_obj: File-like object to upload.
    :param object_name: The desired name of the file in the S3 bucket.
    :return: The public URL of the uploaded file, or None if upload fails.
    """
    s3_client = get_s3_client()
    bucket_name = settings.AWS_S3_BUCKET_NAME

    try:
        s3_client.upload_fileobj(file_obj, bucket_name, object_name)
        logger.info(
            f"Successfully uploaded {object_name} to bucket {bucket_name}.")

        # Construct the public URL
        # Note: This URL format assumes your bucket is public or 
        # you've configured public access.
        # For private buckets, you would generate a pre-signed URL instead.
        url = f"https://{bucket_name}.s3.{
            settings.AWS_REGION}.amazonaws.com/{object_name}"
        return url

    except ClientError as e:
        logger.error(f"Failed to upload {object_name} to S3: {e}")
        return None
