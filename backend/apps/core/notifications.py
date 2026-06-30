import requests
from typing import List, Dict, Any

EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send"

def send_push_notifications(messages: List[Dict[str, Any]]):
    """
    Sends push notifications using Expo's Push API.
    
    `messages` format:
    [
        {
            "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
            "title": "New Quest Available!",
            "body": "Find the hidden lab and earn 50 EXP."
        }
    ]
    """
    if not messages:
        return
        
    try:
        response = requests.post(
            EXPO_PUSH_API_URL,
            json=messages,
            headers={
                "Accept": "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            }
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to send push notification: {e}")
        return None
