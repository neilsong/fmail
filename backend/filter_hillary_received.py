#!/usr/bin/env python3
"""
Filter Clinton emails to show only those received by Hillary Clinton.
"""

import json
import sys
from pathlib import Path

def filter_hillary_received_emails(input_file, output_file=None):
    """
    Filter emails to show only those received by Hillary Clinton.
    
    Hillary's email addresses:
    - HDR22@clintonemail.com
    - hrod17@clintonemail.com
    """
    
    # Define Hillary's email addresses
    hillary_addresses = {
        "H",
        "HDR22@clintonemail.com",
        "hrod17@clintonemail.com"
    }
    
    try:
        # Load the email data
        with open(input_file, 'r', encoding='utf-8') as f:
            emails = json.load(f)
        
        print(f"Total emails in dataset: {len(emails)}")
        
        # Filter for emails received by Hillary and deduplicate
        hillary_received_emails = []
        seen_emails = set()
        
        for email in emails:
            receivers = email.get('receiver', [])
            # Check if any of Hillary's addresses are in the receiver list
            if any(addr in hillary_addresses for addr in receivers):
                # Create a unique key for deduplication
                email_key = f"{email.get('sender', '')}|{email.get('subject', '')}|{email.get('sent_time', '')}|{email.get('text', '')[:200]}"
                
                if email_key not in seen_emails:
                    hillary_received_emails.append(email)
                    seen_emails.add(email_key)
        
        print(f"Emails received by Hillary (after deduplication): {len(hillary_received_emails)}")
        
        # Calculate duplicates removed
        total_before_dedup = len([e for e in emails if any(addr in hillary_addresses for addr in e.get('receiver', []))])
        print(f"Duplicates removed: {total_before_dedup - len(hillary_received_emails)}")
        
        # Print summary of receiver patterns found
        receiver_counts = {}
        for email in hillary_received_emails:
            receivers = email.get('receiver', [])
            # Count Hillary's addresses that appear in receivers
            for addr in receivers:
                if addr in hillary_addresses:
                    receiver_counts[addr] = receiver_counts.get(addr, 0) + 1
        
        print("\nBreakdown by Hillary's email addresses:")
        for addr, count in receiver_counts.items():
            print(f"  '{addr}': {count} emails")
        
        # Print summary of senders
        sender_counts = {}
        for email in hillary_received_emails:
            sender = email.get('sender', 'Unknown')
            sender_counts[sender] = sender_counts.get(sender, 0) + 1
        
        print(f"\nTop 10 senders to Hillary:")
        sorted_senders = sorted(sender_counts.items(), key=lambda x: x[1], reverse=True)
        for sender, count in sorted_senders[:10]:
            print(f"  '{sender}': {count} emails")
        
        # Save filtered results if output file specified
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(hillary_received_emails, f, indent=2, ensure_ascii=False)
            print(f"\nFiltered emails saved to: {output_file}")
        
        return hillary_received_emails
        
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
    
    print(f"\nDisplaying {display_count} of {len(emails)} emails received by Hillary:\n")
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
    output_file = "hillary_emails_received.json"
    
    # Filter the emails
    hillary_received_emails = filter_hillary_received_emails(input_file, output_file)
    
    if hillary_received_emails:
        # Display first 10 emails as preview
        display_emails(hillary_received_emails, limit=10)
        
        if len(hillary_received_emails) > 10:
            print(f"\n... and {len(hillary_received_emails) - 10} more emails.")
            print(f"All {len(hillary_received_emails)} filtered emails saved to '{output_file}'")