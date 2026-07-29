import logging
import httpx
from typing import Optional

logger = logging.getLogger("whatsapp_evolution_client")

class EvolutionAPIError(Exception):
    """Custom exception raised when Evolution API returns an error or fails."""
    pass

class EvolutionClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        instance: str,
        http_client: Optional[httpx.AsyncClient] = None
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.instance = instance
        self.http_client = http_client or httpx.AsyncClient()

    async def send_text(self, phone: str, text: str) -> dict:
        """
        Sends a text message using the Evolution API.
        
        Args:
            phone: The normalized phone number (e.g. 9665xxxxxxxx).
            text: The message body to send.
            
        Returns:
            dict: The API response payload if successful.
            
        Raises:
            EvolutionAPIError: if response status code is not 200 or request fails.
        """
        url = f"{self.base_url}/message/sendText/{self.instance}"
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "number": phone,
            "text": text,
            "options": {
                "delay": 1000,
                "presence": "composing",
                "linkPreview": False
            }
        }
        
        try:
            logger.info(f"Sending WhatsApp message to {phone} via Evolution API...")
            response = await self.http_client.post(
                url,
                json=payload,
                headers=headers,
                timeout=15.0
            )
            
            if response.status_code not in (200, 201):
                logger.error(
                    f"Evolution API returned status {response.status_code}: {response.text}"
                )
                raise EvolutionAPIError(
                    f"Failed to send message, API returned status {response.status_code}"
                )
                
            data = response.json()
            logger.info(f"WhatsApp message sent successfully to {phone}.")
            return data
            
        except httpx.RequestError as exc:
            logger.error(f"HTTP request error while talking to Evolution API: {exc}")
            raise EvolutionAPIError(f"HTTP communication failed: {exc}")
        except Exception as exc:
            logger.error(f"Unexpected error sending WhatsApp: {exc}")
            raise EvolutionAPIError(f"Unexpected error: {exc}")
