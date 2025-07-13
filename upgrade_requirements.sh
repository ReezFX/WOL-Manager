#!/bin/bash

echo "Checking for latest package versions..."

# Create a new requirements file
> new_requirements.txt

# Read each line from requirements.txt
while IFS= read -r line; do
  # Skip empty lines
  if [[ -z "$line" ]]; then
    continue
  fi
  
  # Extract package name
  package=$(echo "$line" | cut -d= -f1)
  
  # Get the latest version (first one in the list)
  latest_version=$(pip index versions "$package" 2>/dev/null | grep -oP 'Available versions: \K.*' | cut -d',' -f1 | tr -d ' ')
  
  # If we found a latest version, use it
  if [[ -n "$latest_version" ]]; then
    echo "$package==$latest_version" >> new_requirements.txt
    echo "Updated $package to $latest_version"
  else
    # If we couldn't find a version, keep the original line
    echo "$line" >> new_requirements.txt
    echo "Kept original: $line"
  fi
done < requirements.txt

echo "Completed generating new_requirements.txt"
