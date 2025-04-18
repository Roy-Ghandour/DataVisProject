
# Imports
library(dplyr)

# Read in the CSV file
reports <- read.csv("mc1-reports-data.csv", stringsAsFactors = FALSE)

# Aggregate by neighborhood (location)
agg_data <- reports %>%
  group_by(location) %>%
  summarise(
    avg_sewer_and_water = mean(sewer_and_water, na.rm = TRUE),
    avg_power = mean(power, na.rm = TRUE),
    avg_roads_and_bridges = mean(roads_and_bridges, na.rm = TRUE),
    avg_medical = mean(medical, na.rm = TRUE),
    avg_buildings = mean(buildings, na.rm = TRUE),
    avg_shake_intensity = mean(shake_intensity, na.rm = TRUE),
    .groups = "drop"
  )

# Save aggregated data to CSV
write.csv(agg_data, "aggregated_reports.csv", row.names = FALSE)