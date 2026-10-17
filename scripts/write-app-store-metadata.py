#!/usr/bin/env python3
"""Write and validate App Store copy against Apple's field lengths."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / 'store-assets/app-store/v3.0/metadata'
out.mkdir(parents=True, exist_ok=True)
metadata = {
    'locale': 'en-US',
    'name': 'TapMiles: Mileage Tracker',
    'subtitle': 'Drive Log, PDF & CSV Reports',
    'keywords': 'car,trip,vehicle,distance,personal,medical,charity,journey,export,work,kilometers,reimbursement',
    'promotional_text': 'Start a drive with one tap. Keep mileage, trip details and projects together, then share clear PDF or CSV reports from your iPhone or iPad.',
    'description': '''Every mile deserves a clear record.

TapMiles helps you track drives and keep a practical mileage log. Tap START DRIVE when you set off, follow your distance and time, then stop and save when you arrive.

TRACK YOUR DRIVE
• See distance, elapsed time, speed and GPS status while recording.
• Record location in the background when the required permissions are enabled.
• Recover a stopped, unsaved recording after reopening the app.

KEEP TRIPS ORGANIZED
• Classify drives as business, personal, medical or charity.
• Assign a vehicle and project to each trip.
• Add notes and review start time, duration and distance.
• Edit trip details, with optional locking after 24 hours.

TURN MILEAGE INTO USEFUL REPORTS
• Review totals for 7, 30 or 90 days, or all time.
• See distance by trip purpose.
• Export mileage reports as PDF or CSV.
• Share an individual trip by PDF, email, SMS or the system share sheet.

SET IT UP YOUR WAY
• Choose miles or kilometers.
• Choose distance rounding to 0.1 or 0.01.
• Maintain your own vehicles and projects.
• Use TapMiles on iPhone and iPad.

No account is required. Trip records are stored on your device.

Location access is required to record a drive. Background location access is needed to continue tracking while the app is in the background. GPS accuracy depends on device reception and conditions. Continued background location use may reduce battery life.

TapMiles is a mileage logging tool, not tax, legal or medical advice. Review your records before relying on them for reimbursement or other purposes.''',
    'whats_new': '''Version 3.0 makes your mileage log more dependable.

• Improved compatibility with iOS 27.
• More reliable local saves and GPS processing.
• Recovery of stopped trips that have not yet been saved.
• Edit trip purpose, project, vehicle and notes.
• Trip locks and edit preferences are now enforced.
• Your selected vehicle is remembered.
• Improved PDF/CSV exports and date labels.''',
    'suggested_primary_category': 'Business',
    'suggested_secondary_category': 'Travel',
    'review_notes': '''No login or demo account is required.

To record: open Track, tap START DRIVE, allow location access, then tap STOP & SAVE. Choose a purpose, project or vehicle, add notes if needed, and save. Reports offers PDF and CSV export. The app uses background location only for an active recording.

Store screenshots contain fictional demonstration trips. They show the actual application interface with descriptive marketing headings.''',
}
limits = {'name':30, 'subtitle':30, 'keywords':100, 'promotional_text':170, 'description':4000, 'whats_new':4000, 'review_notes':4000}
for field, limit in limits.items():
    assert len(metadata[field]) <= limit, (field, len(metadata[field]), limit)
    (out / f'{field}.txt').write_text(metadata[field]+'\n')
(out/'en-US.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False)+'\n')
summary = '# TapMiles — App Store copy (English, United States)\n\n'
for field in ['name','subtitle','keywords','promotional_text','description','whats_new','review_notes']:
    summary += f'## {field.replace("_"," ").title()} ({len(metadata[field])}/{limits[field]})\n\n{metadata[field]}\n\n'
summary += '''## Categories

Suggested primary: Business. Suggested secondary: Travel.

## Search-result strategy

Upload screenshots 01, 02 and 03 first: start tracking, live trip data, and mileage reports. Apple can use the first one to three screenshots in search results when no app preview is present. There is no separate organic search-result image to upload. This keyword set describes supported features; it is not a claim about keyword popularity or search ranking.

## Fields to keep from the existing App Store record

Keep the existing support URL, privacy-policy URL, copyright owner, age-rating answers and pricing unless they need a verified update. Privacy answers must reflect the actual app and included SDKs; they have not been guessed in this package. The included icon is the existing app icon, not a branding change.

## Apple references

- Screenshot sizes and alpha-channel rules: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- Product page fields and screenshot use in search: https://developer.apple.com/app-store/product-page/
- Keywords and discoverability: https://developer.apple.com/app-store/search/
'''
(out/'APP-STORE-COPY.md').write_text(summary)
print({field:len(metadata[field]) for field in limits})
