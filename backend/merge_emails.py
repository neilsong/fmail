#!/usr/bin/env python3
"""
Simple script to merge all individual JSON files in clinton_emails_individual 
directory into a single JSON file.
"""

import json
import os
from pathlib import Path

def merge_email_jsons():
    """
    Merge all JSON files from clinton_emails_individual directory into a single file.
    """
    # Define paths
    input_dir = Path("clinton_emails_individual")
    output_file = Path("all_emails_merged.json")
    
    # Check if input directory exists
    if not input_dir.exists():
        print(f"Error: Directory '{input_dir}' not found!")
        return
    
    # List to store all emails
    all_emails = []
    
    # Process each JSON file
    json_files = list(input_dir.glob("*.json"))
    print(f"Found {len(json_files)} JSON files to merge...")
    
    for json_file in sorted(json_files):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Extract emails from the "emails" array
            if "emails" in data and isinstance(data["emails"], list):
                all_emails.extend(data["emails"])
                print(f"Processed {json_file.name}: {len(data['emails'])} emails")
            else:
                print(f"Warning: {json_file.name} doesn't have expected 'emails' array")
                
        except json.JSONDecodeError as e:
            print(f"Error reading {json_file.name}: {e}")
        except Exception as e:
            print(f"Unexpected error with {json_file.name}: {e}")
    
    # Write merged data to output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_emails, f, indent=2, ensure_ascii=False)
        
        print(f"\nMerge complete!")
        print(f"Total emails merged: {len(all_emails)}")
        print(f"Output file: {output_file}")
        print(f"Output file size: {output_file.stat().st_size / 1024:.1f} KB")
        
    except Exception as e:
        print(f"Error writing output file: {e}")

if __name__ == "__main__":
    merge_email_jsons()
