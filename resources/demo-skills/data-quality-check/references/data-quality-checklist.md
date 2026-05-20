# Data Quality Checklist

Use this checklist after reading the file metadata or sampling rows.

## Schema

- Do column names match the expected schema?
- Are required columns present?
- Are column names stable, unique, and machine-friendly?

## Values

- Are required fields populated?
- Do dates, currencies, booleans, and identifiers use consistent formats?
- Are categorical values normalized?

## Integrity

- Are primary keys unique?
- Are foreign-key-like references present in the related file?
- Are there obvious duplicate rows?

## Analysis Readiness

- Are there enough records for the requested analysis?
- Are filters, time ranges, and exclusions explicit?
- Are anomalies explained before summary statistics are trusted?
