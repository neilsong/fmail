#!/usr/bin/env python3
"""
Test script to demonstrate the email preference learning system.
Run this after starting the FastAPI server to see how preferences are learned.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_preference_system():
    """Test the complete preference learning workflow"""
    
    print("🧪 Testing Email Preference Learning System\n")
    print("📍 Note: All preference endpoints are now in the LLM router\n")
    
    # 1. Generate an email
    print("1️⃣ Generating email for 'john@example.com'...")
    generate_response = requests.post(f"{BASE_URL}/api/generate-email", json={
        "bullets": ["Project update", "Meeting tomorrow", "Send report"],
        "tone": "professional",
        "recipient": "john@example.com",
        "subject": "Project Update"
    })
    
    if generate_response.status_code == 200:
        generated_email = generate_response.json()
        print(f"✅ Generated: {generated_email['subject']}")
        
        # 2. Store the generated email
        email_id = f"test_email_{hash('john@example.com')}"
        store_response = requests.post(f"{BASE_URL}/api/store-generated-email", json={
            "email_id": email_id,
            "recipient": "john@example.com",
            "generated_content": generated_email,
            "final_content": generated_email
        })
        
        if store_response.status_code == 200:
            print("✅ Stored generated email")
            
            # 3. Simulate user editing and analyze diff
            final_email = {
                "subject": "URGENT: Project Update - Action Required",
                "body": "Hi John,\n\nThis is an urgent update about our project. We need to meet tomorrow to discuss critical issues. Please send the report by EOD.\n\nBest regards,\nHilary Clinton"
            }
            
            print("2️⃣ Analyzing diff between generated and final email...")
            diff_response = requests.post(f"{BASE_URL}/api/analyze-email-diff", json={
                "email_id": email_id,
                "recipient": "john@example.com",
                "generated_content": generated_email,
                "final_content": final_email
            })
            
            if diff_response.status_code == 200:
                diff_analysis = diff_response.json()
                print("✅ Diff analysis completed")
                print(f"📊 Changes detected: {len(diff_analysis.get('changes', {}))}")
                print(f"🎯 Preferences learned: {diff_analysis.get('preferences', [])}")
                
                # 4. Check learned preferences
                print("\n3️⃣ Checking learned preferences...")
                pref_response = requests.get(f"{BASE_URL}/api/user-preferences/john@example.com")
                
                if pref_response.status_code == 200:
                    preferences = pref_response.json()
                    print(f"✅ Preferences for john@example.com: {preferences['preferences']}")
                    
                    # 5. Generate another email to see preferences applied
                    print("\n4️⃣ Generating another email with learned preferences...")
                    generate2_response = requests.post(f"{BASE_URL}/api/generate-email", json={
                        "bullets": ["Follow up", "Status check", "Next steps"],
                        "tone": "professional",
                        "recipient": "john@example.com",
                        "subject": "Follow Up"
                    })
                    
                    if generate2_response.status_code == 200:
                        generated2_email = generate2_response.json()
                        print(f"✅ Generated with preferences: {generated2_email['subject']}")
                        print(f"📝 Body preview: {generated2_email['body'][:100]}...")
                    else:
                        print(f"❌ Failed to generate second email: {generate2_response.status_code}")
                else:
                    print(f"❌ Failed to get preferences: {pref_response.status_code}")
            else:
                print(f"❌ Failed to analyze diff: {diff_response.status_code}")
        else:
            print(f"❌ Failed to store email: {store_response.status_code}")
    else:
        print(f"❌ Failed to generate email: {generate_response.status_code}")
    
    # 6. Show all stored preferences
    print("\n5️⃣ All stored preferences:")
    all_diffs_response = requests.get(f"{BASE_URL}/api/email-diffs")
    if all_diffs_response.status_code == 200:
        all_diffs = all_diffs_response.json()
        for recipient_hash, data in all_diffs.items():
            print(f"📧 {data['recipient']}: {list(data['preferences'])}")
    else:
        print(f"❌ Failed to get all diffs: {all_diffs_response.status_code}")

if __name__ == "__main__":
    try:
        test_preference_system()
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure to run: uv run fastapi dev src/api/main.py")
    except Exception as e:
        print(f"❌ Error: {e}") 