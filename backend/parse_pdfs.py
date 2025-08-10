from google import genai
from google.genai import types
import dotenv
import json
import os
import glob
import asyncio
import time
from pathlib import Path
from typing import List, Optional, Union
from pydantic import BaseModel, Field

dotenv.load_dotenv()


class EmailData(BaseModel):
    """Individual email data structure"""
    sender: str = ""  # Email sender (from field)
    sent_time: str = ""
    receiver: List[str] = []  # Email recipients (to field)
    subject: str = ""
    text: str = ""
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    source_file: Optional[str] = None  # Added for tracking which PDF this came from


class ExtractedEmails(BaseModel):
    """Container for all emails extracted from a PDF"""
    emails: List[EmailData] = []

def create_email_extraction_prompt():
    """
    Creates a focused prompt for extracting structured email information from PDFs.
    """
    return """
You are an expert email parser. Analyze the provided PDF document and extract ALL email information.

For each email found, extract:
- sender: sender's email address and/or name (from the "From" field)
- sent_time: date and time the email was sent (preserve original format)
- receiver: recipient email address(es) and/or name(s) as a list (from the "To" field)
- subject: email subject line
- text: the main body content of the email (preserve formatting)
- cc: CC recipients if present (as a list)
- bcc: BCC recipients if present (as a list)

Handle these cases:
- Multiple emails in one PDF: extract all of them
- Missing fields: use null or empty string as appropriate
- Partially redacted addresses: extract what's available
- Email chains/forwards: treat each email separately
- Preserve original text formatting where reasonable

Be thorough and extract all visible email content from the PDF.
"""

def extract_emails_from_pdf(pdf_path: str) -> Optional[ExtractedEmails]:
    """
    Extracts structured email information from a PDF file using Gemini's structured output.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        ExtractedEmails: Structured email data, or None if extraction fails
    """
    try:
        # Read the PDF file
        with open(pdf_path, "rb") as f:
            email_pdf = f.read()

        # Create the extraction prompt
        extraction_prompt = create_email_extraction_prompt()

        # Initialize Gemini client
        gemini_client = genai.Client(http_options=types.HttpOptions(api_version="v1"))
        
        # Use structured output with Pydantic model
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=[
                extraction_prompt,
                types.Part.from_bytes(data=email_pdf, mime_type="application/pdf")
            ],
            config=types.GenerateContentConfig(
                response_schema=ExtractedEmails,
                response_mime_type="application/json"
            )
        )
        
        # Get the parsed Pydantic model directly
        extracted_emails = response.parsed
        
        # Add source file information to each email
        source_filename = os.path.basename(pdf_path)
        for email in extracted_emails.emails:
            email.source_file = source_filename
        
        return extracted_emails
        
    except FileNotFoundError:
        print(f"Error: PDF file not found at {pdf_path}")
        return None
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None

async def extract_emails_from_pdf_async(pdf_path: str, semaphore: asyncio.Semaphore) -> Optional[ExtractedEmails]:
    """
    Async version of email extraction with concurrency control.
    
    Args:
        pdf_path (str): Path to the PDF file
        semaphore: Semaphore to control concurrent API calls
        
    Returns:
        ExtractedEmails: Structured email data, or None if extraction fails
    """
    async with semaphore:  # Limit concurrent API calls
        try:
            # Read the PDF file
            with open(pdf_path, "rb") as f:
                email_pdf = f.read()

            # Create the extraction prompt
            extraction_prompt = create_email_extraction_prompt()

            # Initialize Gemini client
            gemini_client = genai.Client(http_options=types.HttpOptions(api_version="v1"))
            
            # Use structured output with Pydantic model
            # Note: The Gemini client doesn't have native async support yet,
            # so we'll run it in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: gemini_client.models.generate_content(
                    model="gemini-2.5-flash", 
                    contents=[
                        extraction_prompt,
                        types.Part.from_bytes(data=email_pdf, mime_type="application/pdf")
                    ],
                    config=types.GenerateContentConfig(
                        response_schema=ExtractedEmails,
                        response_mime_type="application/json"
                    )
                )
            )
            
            # Get the parsed Pydantic model directly
            extracted_emails = response.parsed
            
            # Add source file information to each email
            source_filename = os.path.basename(pdf_path)
            for email in extracted_emails.emails:
                email.source_file = source_filename
            
            return extracted_emails
            
        except FileNotFoundError:
            print(f"Error: PDF file not found at {pdf_path}")
            return None
        except Exception as e:
            print(f"Error processing PDF {os.path.basename(pdf_path)}: {e}")
            return None

def get_emails_list(pdf_path: str) -> List[EmailData]:
    """
    Convenience function that returns just the list of emails from a PDF.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        List[EmailData]: List of email objects, or empty list if extraction fails
    """
    result = extract_emails_from_pdf(pdf_path)
    if result:
        return result.emails
    return []

def save_emails_to_json(emails: List[EmailData], output_file: str) -> bool:
    """
    Save a list of EmailData objects to a JSON file.
    
    Args:
        emails (List[EmailData]): List of email objects
        output_file (str): Path to output JSON file
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        emails_data = [email.model_dump() for email in emails]
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(emails_data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving emails to {output_file}: {e}")
        return False

def process_pdf_directory(directory_path: str, output_file: Optional[str] = None, limit: Optional[int] = None) -> List[EmailData]:
    """
    Process all PDF files in a directory and extract email data.
    
    Args:
        directory_path (str): Path to directory containing PDF files
        output_file (str, optional): Path to save consolidated JSON output
        limit (int, optional): Maximum number of PDFs to process
        
    Returns:
        List[EmailData]: List of all extracted email data
    """
    pdf_files = glob.glob(os.path.join(directory_path, "*.pdf"))
    
    if limit:
        pdf_files = pdf_files[:limit]
    
    print(f"Found {len(pdf_files)} PDF files to process")
    
    all_emails: List[EmailData] = []
    successful_extractions = 0
    failed_files = []
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\nProcessing {i}/{len(pdf_files)}: {os.path.basename(pdf_path)}")
        
        try:
            result = extract_emails_from_pdf(pdf_path)
            
            if result and result.emails:
                all_emails.extend(result.emails)
                successful_extractions += 1
                print(f"✓ Successfully extracted {len(result.emails)} emails")
                
                # Save progress every 10 files
                if i % 10 == 0 and output_file:
                    temp_output = f"temp_{output_file}"
                    if save_emails_to_json(all_emails, temp_output):
                        print(f"  💾 Progress saved to {temp_output}")
            else:
                print(f"✗ Failed to extract emails")
                failed_files.append(os.path.basename(pdf_path))
                
        except KeyboardInterrupt:
            print(f"\n⚠️ Processing interrupted by user at file {i}/{len(pdf_files)}")
            break
        except Exception as e:
            print(f"✗ Error processing {os.path.basename(pdf_path)}: {e}")
            failed_files.append(os.path.basename(pdf_path))
    
    print(f"\n=== SUMMARY ===")
    print(f"Processed: {successful_extractions}/{len(pdf_files)} PDFs")
    print(f"Failed: {len(failed_files)} PDFs")
    print(f"Total emails extracted: {len(all_emails)}")
    
    if failed_files:
        print(f"Failed files: {', '.join(failed_files[:10])}")
        if len(failed_files) > 10:
            print(f"... and {len(failed_files) - 10} more")
    
    # Save to file if requested
    if output_file:
        if save_emails_to_json(all_emails, output_file):
            print(f"Saved all extracted emails to: {output_file}")
        else:
            print(f"Failed to save emails to: {output_file}")
    
    return all_emails

async def process_pdf_directory_async(
    directory_path: str, 
    output_file: Optional[str] = None, 
    limit: Optional[int] = None,
    max_concurrent: int = 10
) -> List[EmailData]:
    """
    Async version that processes PDFs concurrently for much faster execution.
    
    Args:
        directory_path (str): Path to directory containing PDF files
        output_file (str, optional): Path to save consolidated JSON output
        limit (int, optional): Maximum number of PDFs to process
        max_concurrent (int): Maximum number of concurrent API calls (default: 10)
        
    Returns:
        List[EmailData]: List of all extracted email data
    """
    pdf_files = glob.glob(os.path.join(directory_path, "*.pdf"))
    
    if limit:
        pdf_files = pdf_files[:limit]
    
    print(f"Found {len(pdf_files)} PDF files to process")
    print(f"Processing with max {max_concurrent} concurrent requests")
    
    # Create semaphore to limit concurrent API calls
    semaphore = asyncio.Semaphore(max_concurrent)
    
    all_emails: List[EmailData] = []
    successful_extractions = 0
    failed_files = []
    
    # Process files in batches to manage memory and provide progress updates
    batch_size = 50
    start_time = time.time()
    
    for batch_start in range(0, len(pdf_files), batch_size):
        batch_end = min(batch_start + batch_size, len(pdf_files))
        batch_files = pdf_files[batch_start:batch_end]
        
        print(f"\n=== Processing batch {batch_start//batch_size + 1} ({batch_start + 1}-{batch_end} of {len(pdf_files)}) ===")
        
        # Create tasks for this batch
        tasks = [
            extract_emails_from_pdf_async(pdf_path, semaphore) 
            for pdf_path in batch_files
        ]
        
        # Execute batch concurrently
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for i, (pdf_path, result) in enumerate(zip(batch_files, results)):
                file_num = batch_start + i + 1
                filename = os.path.basename(pdf_path)
                
                if isinstance(result, Exception):
                    print(f"✗ {file_num}/{len(pdf_files)} {filename}: {result}")
                    failed_files.append(filename)
                elif result and result.emails:
                    all_emails.extend(result.emails)
                    successful_extractions += 1
                    print(f"✓ {file_num}/{len(pdf_files)} {filename}: {len(result.emails)} emails")
                else:
                    print(f"✗ {file_num}/{len(pdf_files)} {filename}: No emails found")
                    failed_files.append(filename)
            
            # Save progress after each batch
            if output_file:
                temp_output = f"temp_{output_file}"
                if save_emails_to_json(all_emails, temp_output):
                    elapsed = time.time() - start_time
                    rate = successful_extractions / elapsed if elapsed > 0 else 0
                    print(f"  💾 Progress saved: {len(all_emails)} emails from {successful_extractions} PDFs ({rate:.1f} files/sec)")
                    
        except KeyboardInterrupt:
            print(f"\n⚠️ Processing interrupted by user at batch {batch_start//batch_size + 1}")
            break
    
    elapsed = time.time() - start_time
    
    print(f"\n=== ASYNC SUMMARY ===")
    print(f"Processed: {successful_extractions}/{len(pdf_files)} PDFs in {elapsed:.1f} seconds")
    print(f"Success rate: {successful_extractions/len(pdf_files)*100:.1f}%")
    print(f"Processing rate: {successful_extractions/elapsed:.1f} files/sec")
    print(f"Failed: {len(failed_files)} PDFs")
    print(f"Total emails extracted: {len(all_emails)}")
    
    if failed_files:
        print(f"Failed files: {', '.join(failed_files[:10])}")
        if len(failed_files) > 10:
            print(f"... and {len(failed_files) - 10} more")
    
    # Save final results
    if output_file:
        if save_emails_to_json(all_emails, output_file):
            print(f"Saved all extracted emails to: {output_file}")
        else:
            print(f"Failed to save emails to: {output_file}")
    
    return all_emails

def main():
    # Example usage with a single PDF
    print("=== SINGLE PDF PROCESSING ===")
    email_fp = "Clinton_Email_August_Release/C05765907.pdf"
    
    print(f"Processing: {email_fp}")
    result = extract_emails_from_pdf(email_fp)
    
    if result and result.emails:
        print("\nExtracted email data:")
        # Convert to JSON for display
        result_dict = result.model_dump()
        print(json.dumps(result_dict, indent=2, ensure_ascii=False))
        
        print(f"\nFound {len(result.emails)} emails in the PDF")
        
        # Show summary of each email
        for i, email in enumerate(result.emails, 1):
            print(f"  Email {i}: From {email.sender} - Subject: {email.subject}")
    else:
        print("Failed to extract email data from PDF")
    
    # Async batch process PDFs in the directory (much faster!)
    print("\n=== ASYNC BATCH PROCESSING ===")
    all_emails = asyncio.run(process_pdf_directory_async(
        "Clinton_Email_August_Release", 
        output_file="extracted_emails_async.json",
        limit=100,  # Process first 100 PDFs as a test batch
        max_concurrent=15  # Increase concurrency for speed
    ))

async def process_all_emails():
    """
    Process ALL emails in the Clinton dataset with async concurrency.
    This is the high-performance version for processing the full dataset.
    """
    print("=== PROCESSING ALL CLINTON EMAILS (ASYNC) ===")
    print("This will process all 4,368+ PDFs with concurrent API calls")
    
    all_emails = await process_pdf_directory_async(
        "Clinton_Email_August_Release", 
        output_file="clinton_emails_complete.json",
        limit=None,  # Process ALL PDFs
        max_concurrent=20  # High concurrency for maximum speed
    )
    
    print(f"\n🎉 COMPLETE! Extracted {len(all_emails)} total emails from Clinton dataset")
    return all_emails

if __name__ == "__main__":
    main()

# To process ALL emails, uncomment and run:
# asyncio.run(process_all_emails())

# Example usage:
# 
# # Extract emails from a single PDF (returns ExtractedEmails object)
# result = extract_emails_from_pdf("path/to/email.pdf")
# if result:
#     for email in result.emails:
#         print(f"From: {email.sender}")
#         print(f"Subject: {email.subject}")
#         print(f"Text: {email.text[:100]}...")
#         print(f"To: {', '.join(email.receiver)}")
#         if email.cc:
#             print(f"CC: {', '.join(email.cc)}")
#
# # Or use the convenience function for just the email list
# emails = get_emails_list("path/to/email.pdf")
# for email in emails:
#     print(f"Email from {email.sender} sent at {email.sent_time}")
#
# # Process multiple PDFs
# all_emails = process_pdf_directory(
#     "Clinton_Email_August_Release/", 
#     output_file="all_emails.json",
#     limit=10  # Process first 10 PDFs only
# )
#
# # Access individual email properties with type safety
# for email in all_emails:
#     print(f"From: {email.sender}")
#     print(f"Sent: {email.sent_time}")
#     print(f"Recipients: {len(email.receiver)}")
#     print(f"Source: {email.source_file}")