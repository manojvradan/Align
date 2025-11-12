# services/user-api/app/security.py
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os
import requests

AWS_REGION = os.getenv("VITE_AWS_REGION", "us-east-1")  # CHANGE TO YOUR REGION
COGNITO_USER_POOL_ID = os.getenv("VITE_COGNITO_USER_POOL_ID", "your-user-pool-id")
COGNITO_APP_CLIENT_ID = os.getenv("VITE_COGNITO_APP_CLIENT_ID", "your-app-client-id")

COGNITO_JWKS_URL = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

# --- Cognito JWT Validation ---
# Cache the keys for performance
_cognito_jwks = None


def get_cognito_jwks():
    """
    Fetches and caches the JSON Web Key Set from Cognito.
    """
    global _cognito_jwks
    if _cognito_jwks is None:
        try:
            response = requests.get(COGNITO_JWKS_URL)
            response.raise_for_status()
            _cognito_jwks = response.json()
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=500, detail=f"Could not fetch Cognito JWKS: {e}")
    return _cognito_jwks


# This dependency can be used on any protected endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_current_user_claims(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency to validate a Cognito JWT and return its claims.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        jwks = get_cognito_jwks()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
        if not rsa_key:
            raise credentials_exception

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID,
            issuer=f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}",
        )
        return payload
    except JWTError as e:
        # Log the error for debugging
        print(f"JWT Validation Error: {e}")
        raise credentials_exception