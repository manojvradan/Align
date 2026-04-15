import argparse
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")


def paginate_users(client, user_pool_id):
    paginator = client.get_paginator("list_users")
    for page in paginator.paginate(UserPoolId=user_pool_id):
        for user in page.get("Users", []):
            yield user


def extract_email(user):
    for attr in user.get("Attributes", []):
        if attr.get("Name") == "email":
            return attr.get("Value")
    return None


def list_users(client, user_pool_id):
    users = list(paginate_users(client, user_pool_id))
    if not users:
        print("No users found in this user pool.")
        return users

    print(f"Found {len(users)} users:")
    for user in users:
        username = user.get("Username")
        email = extract_email(user) or "(no email)"
        status = user.get("UserStatus", "UNKNOWN")
        print(f"- Username={username} | Email={email} | Status={status}")
    return users


def delete_user(client, user_pool_id, username):
    client.admin_delete_user(UserPoolId=user_pool_id, Username=username)
    print(f"Deleted user: {username}")


def find_usernames_by_email(client, user_pool_id, email):
    # Cognito filter syntax requires quoted string.
    response = client.list_users(
        UserPoolId=user_pool_id,
        Filter=f'email = "{email}"',
    )
    return [
        user.get("Username")
        for user in response.get("Users", [])
        if user.get("Username")
    ]


def delete_by_email(client, user_pool_id, email, force):
    usernames = find_usernames_by_email(client, user_pool_id, email)
    if not usernames:
        print(f"No Cognito user found with email: {email}")
        return

    print(f"Users matching {email}: {usernames}")
    if not force:
        print("Dry run only. Re-run with --force to delete.")
        return

    for username in usernames:
        delete_user(client, user_pool_id, username)


def delete_all_users(client, user_pool_id, force):
    users = list_users(client, user_pool_id)
    if not users:
        return

    if not force:
        print("Dry run only. Re-run with --force to delete all users.")
        return

    for user in users:
        delete_user(client, user_pool_id, user["Username"])


def parse_args():
    parser = argparse.ArgumentParser(
        description="List and delete AWS Cognito users in a user pool"
    )
    parser.add_argument(
        "--user-pool-id",
        required=True,
        help="Cognito User Pool ID",
    )
    parser.add_argument(
        "--region",
        required=True,
        help="AWS region, e.g. ap-southeast-2",
    )

    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--list", action="store_true", help="List users only")
    action.add_argument(
        "--delete-all",
        action="store_true",
        help="Delete all users",
    )
    action.add_argument("--delete-email", help="Delete user(s) by email")
    action.add_argument(
        "--delete-username",
        help="Delete a user by Cognito username",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "Actually perform deletion. "
            "Without this flag, delete actions are dry-run."
        ),
    )
    return parser.parse_args()


def main():
    args = parse_args()
    client = boto3.client("cognito-idp", region_name=args.region)

    try:
        if args.list:
            list_users(client, args.user_pool_id)
        elif args.delete_all:
            delete_all_users(client, args.user_pool_id, args.force)
        elif args.delete_email:
            delete_by_email(
                client,
                args.user_pool_id,
                args.delete_email,
                args.force,
            )
        elif args.delete_username:
            if not args.force:
                print(
                    "Dry run only. "
                    f"Would delete username: {args.delete_username}"
                )
            else:
                delete_user(client, args.user_pool_id, args.delete_username)
    except ClientError as exc:
        message = exc.response.get("Error", {}).get("Message", str(exc))
        print(f"AWS error: {message}")


if __name__ == "__main__":
    main()
