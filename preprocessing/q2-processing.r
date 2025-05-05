# Load necessary libraries
library(dplyr)
library(lubridate)

# Load the dataset
df <- read.csv("cleaned-data.csv")

# Preview the data
head(df)

# Convert 'time' column to datetime
df$time <- ymd_hms(df$time)

# Handle missing values (e.g., forward fill)
df <- df %>%
  mutate(across(
    c(shake_intensity, sewer_and_water, power, roads_and_bridges, medical, buildings),
    ~ zoo::na.fill(., fill = "extend")
  ))

# Convert categorical columns to integers
df <- df %>%
  mutate(across(
    c(shake_intensity, sewer_and_water, power, roads_and_bridges, medical, buildings),
    as.integer
  ))

# Check the structure of the data
str(df)

# Save cleaned data to CSV
write.csv(df, "q2-data.csv", row.names = FALSE)
