# Imports
library(readr)
library(dplyr)
library(lubridate)

# Read in the CSV file
reports <- read.csv("mc1-reports-data.csv", stringsAsFactors = FALSE)

# Filter out invalid times
reports <- reports %>%
  mutate(time_parsed = ymd_hms(time)) %>%
  filter(minute(time_parsed) %% 5 == 0 & second(time_parsed) == 0) %>%
  select(-time_parsed)

# Save aggregated data to CSV
write.csv(reports, "reports.csv", row.names = FALSE)
