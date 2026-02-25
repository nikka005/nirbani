"""
SMS Service for Nirbani Dairy using MSG91
Handles milk collection confirmations and payment notifications
"""
import os
import http.client
import json
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class MSG91Service:
    """MSG91 SMS Service for sending transactional SMS"""
    
    def __init__(self):
        self.auth_key = os.environ.get('MSG91_AUTH_KEY', '')
        self.sender_id = os.environ.get('MSG91_SENDER_ID', 'NIRDRY')
        self.route = os.environ.get('MSG91_ROUTE', '4')  # 4 for transactional
        self.country = '91'  # India
        self.api_endpoint = 'api.msg91.com'
        self.enabled = bool(self.auth_key)
        
        if not self.enabled:
            logger.warning("MSG91 SMS service not configured - SMS_AUTH_KEY not set")
    
    def send_sms(
        self,
        phone: str,
        message: str,
        template_id: Optional[str] = None
    ) -> dict:
        """
        Send SMS via MSG91 API
        
        Args:
            phone: Phone number (10 digits, without country code)
            message: SMS message content
            template_id: DLT approved template ID (required for India)
        
        Returns:
            dict with success status and response
        """
        if not self.enabled:
            logger.info(f"SMS disabled - Would send to {phone}: {message}")
            return {"success": True, "simulated": True, "message": "SMS disabled - simulated"}
        
        try:
            # Format phone number
            phone = phone.replace('+91', '').replace(' ', '').strip()
            if len(phone) == 10:
                phone = f"91{phone}"
            
            conn = http.client.HTTPSConnection(self.api_endpoint)
            
            payload = {
                "sender": self.sender_id,
                "route": self.route,
                "country": self.country,
                "sms": [{
                    "message": message,
                    "to": [phone]
                }]
            }
            
            if template_id:
                payload["template_id"] = template_id
            
            headers = {
                'authkey': self.auth_key,
                'content-type': 'application/json'
            }
            
            conn.request("POST", "/api/v5/flow", json.dumps(payload), headers)
            response = conn.getresponse()
            response_data = response.read().decode('utf-8')
            conn.close()
            
            result = json.loads(response_data)
            
            return {
                "success": response.status == 200,
                "status_code": response.status,
                "response": result
            }
            
        except Exception as e:
            logger.error(f"SMS sending failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_collection_notification(
        self,
        farmer_name: str,
        farmer_phone: str,
        quantity: float,
        fat: float,
        rate: float,
        amount: float,
        shift: str
    ) -> dict:
        """Send milk collection confirmation SMS to farmer"""
        
        shift_hindi = "सुबह" if shift == "morning" else "शाम"
        
        # Bilingual message
        message = (
            f"Nirbani Dairy: {farmer_name} जी, आपका {shift_hindi} का दूध:\n"
            f"मात्रा: {quantity}L | फैट: {fat}%\n"
            f"दर: ₹{rate}/L | राशि: ₹{amount}\n"
            f"धन्यवाद!"
        )
        
        return self.send_sms(
            phone=farmer_phone,
            message=message,
            template_id=os.environ.get('MSG91_COLLECTION_TEMPLATE_ID')
        )
    
    def send_payment_notification(
        self,
        farmer_name: str,
        farmer_phone: str,
        amount: float,
        payment_mode: str,
        new_balance: float
    ) -> dict:
        """Send payment confirmation SMS to farmer"""
        
        mode_hindi = {
            'cash': 'नकद',
            'upi': 'यूपीआई',
            'bank': 'बैंक'
        }.get(payment_mode, payment_mode)
        
        message = (
            f"Nirbani Dairy: {farmer_name} जी,\n"
            f"₹{amount} का भुगतान {mode_hindi} द्वारा प्राप्त।\n"
            f"बकाया राशि: ₹{new_balance}\n"
            f"धन्यवाद!"
        )
        
        return self.send_sms(
            phone=farmer_phone,
            message=message,
            template_id=os.environ.get('MSG91_PAYMENT_TEMPLATE_ID')
        )


# Global SMS service instance
sms_service = MSG91Service()


def send_collection_sms(
    farmer_name: str,
    farmer_phone: str,
    quantity: float,
    fat: float,
    rate: float,
    amount: float,
    shift: str
):
    """Helper function to send collection SMS"""
    return sms_service.send_collection_notification(
        farmer_name=farmer_name,
        farmer_phone=farmer_phone,
        quantity=quantity,
        fat=fat,
        rate=rate,
        amount=amount,
        shift=shift
    )


def send_payment_sms(
    farmer_name: str,
    farmer_phone: str,
    amount: float,
    payment_mode: str,
    new_balance: float
):
    """Helper function to send payment SMS"""
    return sms_service.send_payment_notification(
        farmer_name=farmer_name,
        farmer_phone=farmer_phone,
        amount=amount,
        payment_mode=payment_mode,
        new_balance=new_balance
    )
