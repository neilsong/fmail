import json
import re

def count_words(text):
    """Count words in text, handling None and empty strings"""
    if not text or text.strip() == "":
        return 0
    # Use regex to split on whitespace and count non-empty tokens
    words = re.findall(r'\S+', text.strip())
    return len(words)

def cleanup_short_emails(input_file, output_file, min_words=5):
    """Remove emails with fewer than min_words from the dataset"""
    
    print(f"Loading emails from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        emails = json.load(f)
    
    print(f"Original email count: {len(emails)}")
    
    # Filter emails with at least min_words
    filtered_emails = []
    removed_count = 0
    
    for email in emails:
        word_count = count_words(email.get('text', ''))
        if word_count >= min_words:
            filtered_emails.append(email)
        else:
            removed_count += 1
    
    print(f"Removed {removed_count} emails with fewer than {min_words} words")
    print(f"Remaining email count: {len(filtered_emails)}")
    
    # Save filtered emails
    print(f"Saving filtered emails to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_emails, f, indent=2, ensure_ascii=False)
    
    print("Cleanup completed!")

if __name__ == "__main__":
    input_file = "all_emails_merged.json"
    output_file = "all_emails_merged_cleaned.json"
    
    cleanup_short_emails(input_file, output_file, min_words=5)
