# Imports
library(readr)
library(dplyr)
library(lubridate)

# Read in the source CSV file
reports <- read.csv("mc1-reports-data.csv", stringsAsFactors = FALSE)

# Filter out invalid times
reports <- reports %>%
  mutate(time_parsed = ymd_hms(time)) %>%
  filter(minute(time_parsed) %% 5 == 0 & second(time_parsed) == 0) %>%
  select(-time_parsed)

# Save cleaned data to CSV
write.csv(reports, "cleaned-data.csv", row.names = FALSE)
