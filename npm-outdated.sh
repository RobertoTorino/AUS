#!/bin/sh
# Set the terminal you use here: bash or zsh or another.
export TERM=xterm-256color

cd cdk || exit

# Run npm outdated to get a list of outdated packages
outdated_packages=$(npm outdated -l --parseable)

# Check if there are any outdated packages
if [ -n "$outdated_packages" ]; then
  # Extract unique package names
  unique_package_names=$(echo "$outdated_packages" | awk -F: '{print $1}' | sort -u)

  # Loop through unique package names and update
  for package_name in $unique_package_names; do
    # Run npm install to update the package to the latest version
    npm install "$package_name"@"latest"
    echo "$package_name updated successfully."
  done
else
  echo "No outdated packages found."
fi

echo "check for result:" && npm outdated -l

