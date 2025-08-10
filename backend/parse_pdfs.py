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

def save_pdf_emails_individually(extracted_emails: ExtractedEmails, pdf_filename: str, output_dir: str = "extracted_emails") -> bool:
    """
    Save emails from a single PDF to its own JSON file.
    
    Args:
        extracted_emails (ExtractedEmails): Emails extracted from PDF
        pdf_filename (str): Name of the source PDF file
        output_dir (str): Directory to save individual email files
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Create filename based on PDF name (remove .pdf extension, add .json)
        json_filename = os.path.splitext(pdf_filename)[0] + ".json"
        output_path = os.path.join(output_dir, json_filename)
        
        # Save the extracted emails
        emails_data = extracted_emails.model_dump()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(emails_data, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Error saving emails from {pdf_filename}: {e}")
        return False

def load_existing_extractions(output_dir: str = "extracted_emails") -> set:
    """
    Get set of PDF filenames that have already been processed.
    
    Args:
        output_dir (str): Directory containing individual email files
        
    Returns:
        set: Set of PDF filenames (without extension) already processed
    """
    if not os.path.exists(output_dir):
        return set()
    
    processed = set()
    for filename in os.listdir(output_dir):
        if filename.endswith('.json'):
            pdf_name = os.path.splitext(filename)[0] + '.pdf'
            processed.add(pdf_name)
    
    return processed

def merge_individual_files(input_dir: str = "extracted_emails", output_file: str = "merged_emails.json") -> List[EmailData]:
    """
    Merge all individual email JSON files into one consolidated file.
    
    Args:
        input_dir (str): Directory containing individual email files
        output_file (str): Path for merged output file
        
    Returns:
        List[EmailData]: All emails from all files
    """
    if not os.path.exists(input_dir):
        print(f"Directory {input_dir} does not exist")
        return []
    
    all_emails = []
    processed_files = 0
    failed_files = []
    
    print(f"Merging files from {input_dir}...")
    
    for filename in sorted(os.listdir(input_dir)):
        if not filename.endswith('.json'):
            continue
            
        file_path = os.path.join(input_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Handle both old format (direct list) and new format (with 'emails' key)
            if isinstance(data, dict) and 'emails' in data:
                emails_data = data['emails']
            elif isinstance(data, list):
                emails_data = data
            else:
                print(f"Warning: Unexpected format in {filename}")
                continue
            
            # Convert to EmailData objects
            for email_dict in emails_data:
                try:
                    email = EmailData(**email_dict)
                    all_emails.append(email)
                except Exception as e:
                    print(f"Warning: Error parsing email in {filename}: {e}")
            
            processed_files += 1
            
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            failed_files.append(filename)
    
    print(f"Merged {processed_files} files, {len(all_emails)} total emails")
    if failed_files:
        print(f"Failed to read {len(failed_files)} files: {', '.join(failed_files[:5])}")
    
    # Save merged file
    if output_file and save_emails_to_json(all_emails, output_file):
        print(f"Saved merged emails to: {output_file}")
    
    return all_emails

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
    max_concurrent: int = 10,
    individual_files: bool = True,
    output_dir: str = "extracted_emails",
    resume: bool = True
) -> List[EmailData]:
    """
    Async version that processes PDFs concurrently with individual file saving.
    
    Args:
        directory_path (str): Path to directory containing PDF files
        output_file (str, optional): Path to save consolidated JSON output
        limit (int, optional): Maximum number of PDFs to process
        max_concurrent (int): Maximum number of concurrent API calls (default: 10)
        individual_files (bool): Save each PDF's emails to individual files (default: True)
        output_dir (str): Directory for individual email files (default: "extracted_emails")
        resume (bool): Skip already processed files (default: True)
        
    Returns:
        List[EmailData]: List of all extracted email data
    """
    pdf_files = glob.glob(os.path.join(directory_path, "*.pdf"))
    
    # Filter out already processed files if resuming
    if resume and individual_files:
        existing = load_existing_extractions(output_dir)
        original_count = len(pdf_files)
        pdf_files = [f for f in pdf_files if os.path.basename(f) not in existing]
        skipped = original_count - len(pdf_files)
        if skipped > 0:
            print(f"Resuming: Skipped {skipped} already processed files")
    
    if limit:
        pdf_files = pdf_files[:limit]
    
    print(f"Found {len(pdf_files)} PDF files to process")
    print(f"Processing with max {max_concurrent} concurrent requests")
    if individual_files:
        print(f"Saving individual files to: {output_dir}/")
    
    # Create output directory if using individual files
    if individual_files:
        os.makedirs(output_dir, exist_ok=True)
    
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
                    # Save individual file if requested
                    if individual_files:
                        if save_pdf_emails_individually(result, filename, output_dir):
                            successful_extractions += 1
                            all_emails.extend(result.emails)
                            print(f"✓ {file_num}/{len(pdf_files)} {filename}: {len(result.emails)} emails → {output_dir}/{os.path.splitext(filename)[0]}.json")
                        else:
                            print(f"✗ {file_num}/{len(pdf_files)} {filename}: Failed to save individual file")
                            failed_files.append(filename)
                    else:
                        all_emails.extend(result.emails)
                        successful_extractions += 1
                        print(f"✓ {file_num}/{len(pdf_files)} {filename}: {len(result.emails)} emails")
                else:
                    print(f"✗ {file_num}/{len(pdf_files)} {filename}: No emails found")
                    failed_files.append(filename)
            
            # Progress update after each batch
            elapsed = time.time() - start_time
            rate = successful_extractions / elapsed if elapsed > 0 else 0
            
            if individual_files:
                print(f"  📁 Batch complete: {len(all_emails)} emails from {successful_extractions} PDFs ({rate:.1f} files/sec)")
            elif output_file:
                temp_output = f"temp_{output_file}"
                if save_emails_to_json(all_emails, temp_output):
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
    # Async batch process PDFs with individual file structure (much faster!)
    print("\n=== ASYNC BATCH PROCESSING (INDIVIDUAL FILES) ===")
    all_emails = asyncio.run(process_pdf_directory_async(
        "Clinton_Email_August_Release", 
        output_file=None,  # No single file output
        limit=None,  # Process all PDFs
        max_concurrent=8,
        individual_files=True,  # Save each PDF to its own file
        output_dir="clinton_emails_individual",
        resume=True  # Skip already processed files
    ))
    
    # Demonstrate merging individual files
    print("\n=== MERGING INDIVIDUAL FILES ===")
    merged_emails = merge_individual_files(
        input_dir="clinton_emails_individual",
        output_file="clinton_emails_merged.json"
    )

async def process_all_emails():
    """
    Process ALL emails in the Clinton dataset with individual file structure.
    This is the high-performance, resumable version for the full dataset.
    """
    print("=== PROCESSING ALL CLINTON EMAILS (INDIVIDUAL FILES) ===")
    print("This will process all 4,368+ PDFs with concurrent API calls")
    print("Each PDF's emails will be saved to individual files for better reliability")
    
    all_emails = await process_pdf_directory_async(
        "Clinton_Email_August_Release", 
        output_file=None,  # No single file - use individual files
        limit=None,  # Process ALL PDFs
        max_concurrent=16,  # Balanced concurrency
        individual_files=True,
        output_dir="clinton_emails_complete",
        resume=True  # Resume from where we left off
    )
    print(f"\n🎉 PROCESSING COMPLETE!")
    print(f"Individual files saved to: clinton_emails_complete/")
    print(f"Run merge_individual_files() to create consolidated JSON")
    
    return all_emails

if __name__ == "__main__":
    main()