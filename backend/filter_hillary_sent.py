#!/usr/bin/env python3
"""
Filter Clinton emails to show only those sent by Hillary Clinton.
"""

import json
import sys
from pathlib import Path

def filter_hillary_emails(input_file, output_file=None):
    """
    Filter emails to show only those sent by Hillary Clinton.
    
    Hillary's sender patterns:
    - "H"
    - "H <HDR22@clintonemail.com>"
    - "H [mailto: HDR22@clintonemail.com]"
    - "H <hrod17@clintonemail.com>"
    """
    
    # Define Hillary's sender patterns
    hillary_senders = {
        "H",
        "H <HDR22@clintonemail.com>",
        "H [mailto: HDR22@clintonemail.com]",
        "H <hrod17@clintonemail.com>"
    }
    
    try:
        # Load the email data
        with open(input_file, 'r', encoding='utf-8') as f:
            emails = json.load(f)
        
        print(f"Total emails in dataset: {len(emails)}")
        
        # Filter for Hillary's emails and deduplicate
        hillary_emails = []
        seen_emails = set()
        
        for email in emails:
            sender = email.get('sender', '')
            if sender in hillary_senders:
                # Create a unique key for deduplication
                email_key = f"{email.get('sender', '')}|{email.get('subject', '')}|{email.get('sent_time', '')}|{email.get('text', '')[:200]}"
                
                if email_key not in seen_emails:
                    hillary_emails.append(email)
                    seen_emails.add(email_key)
        
        print(f"Emails sent by Hillary (after deduplication): {len(hillary_emails)}")
        print(f"Duplicates removed: {len([e for e in emails if e.get('sender', '') in hillary_senders]) - len(hillary_emails)}")
        
        # Print summary of sender patterns found
        sender_counts = {}
        for email in hillary_emails:
            sender = email.get('sender', '')
            sender_counts[sender] = sender_counts.get(sender, 0) + 1
        
        print("\nBreakdown by sender pattern:")
        for sender, count in sender_counts.items():
            print(f"  '{sender}': {count} emails")
        
        # Save filtered results if output file specified
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(hillary_emails, f, indent=2, ensure_ascii=False)
            print(f"\nFiltered emails saved to: {output_file}")
        
        return hillary_emails
        
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file '{input_file}': {e}")
        return []
    except Exception as e:
        print(f"Error: {e}")
        return []

def display_emails(emails, limit=None):
    """Display email summaries."""
    if not emails:
        print("No emails to display.")
        return
    
    display_count = len(emails) if limit is None else min(limit, len(emails))
    
    print(f"\nDisplaying {display_count} of {len(emails)} emails from Hillary:\n")
    print("=" * 80)
    
    for i, email in enumerate(emails[:display_count]):
        print(f"Email {i+1}:")
        print(f"  From: {email.get('sender', 'N/A')}")
        print(f"  To: {', '.join(email.get('receiver', []))}")
        print(f"  Date: {email.get('sent_time', 'N/A')}")
        print(f"  Subject: {email.get('subject', 'N/A')}")
        
        # Show first 100 characters of text
        text = email.get('text', 'N/A')
        if len(text) > 100:
            text = text[:100] + "..."
        print(f"  Text: {text}")
        print(f"  Source: {email.get('source_file', 'N/A')}")
        print("-" * 80)

if __name__ == "__main__":
    input_file = "all_emails_merged_cleaned.json"
    output_file = "hillary_emails_only.json"
    
    # Filter the emails
    hillary_emails = filter_hillary_emails(input_file, output_file)
    
    if hillary_emails:
        # Display first 10 emails as preview
        display_emails(hillary_emails, limit=10)
        
        if len(hillary_emails) > 10:
            print(f"\n... and {len(hillary_emails) - 10} more emails.")
            print(f"All {len(hillary_emails)} filtered emails saved to '{output_file}'")