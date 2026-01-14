<!-- Sync update: v27.9 - Strategy engine refinement -->
# 10 Questions to Perfect Sundrop Finance

Here is the implementation of the FY27 Strategic Planner. To refine it further, I have the following questions based on your specification:

1.  **Tuition Price Dependency:** I implemented the 3-Day/4-Day/Half-Day prices as *calculated* fields based on the Full-Time price and the Ratios. Is this correct, or should the user be able to manually override a specific tier's price regardless of the ratio?
2.  **Discount Calculation Basis:** I am calculating the dollar value of discounts using the `Weighted Average Tuition Price` across all tiers `(Total Gross / Total Students)`. Is this accurate, or should discounts be calculated against the specific tier the student is in (which would require assigning scholarship students to specific tiers)?
3.  **Firebase Security:** The spec uses a client-side password (`finance26`). Since we are enabling Firebase, should I implement Firebase Authentication (e.g., Anonymous or Email/Password) to secure the database rules, or is open access (read/write for anyone with the app) acceptable for this prototype?
4.  **Data Persistence Model:** Should the app "Autosave" to a single global document (overwriting everyone's work), or should I create a "Scenario" system where users save named versions (e.g., "Aggressive Growth v1")? (Currently implemented as a single document autosave).
5.  **Revenue Linkage:** In the Revenue tab, I strictly locked "Tuition Income" to the `Net Tuition` calculated in the Strategy tab. Should this include "Afterschool Program Revenue" or is that treated as a separate manual line item?
6.  **Budget Granularity:** For the "Smart Tables", do you need a monthly breakdown (seasonality), or is a flat annual FY27 projection sufficient? (Currently implemented as flat annual).
7.  **Visualizations:** Beyond the Pie Chart for revenue composition, would a "Waterfall Chart" showing how Expenses eat into Revenue to form the Margin be helpful on the Budget tab?
8.  **Mobile Usage:** On phone screens, the wide tables (Baseline, % Mod, $ Mod, Final) will be cramped. Should I hide the "Baseline" columns on mobile and only show the "Final" numbers and modifiers?
9.  **Legacy Data:** You provided FY26 Actuals. Do you want a column explicitly showing "Year-over-Year Delta" (e.g., "Rent is up 5% vs FY26")?
10. **Export:** Do you require a feature to export the final grid to CSV or PDF for board meetings?

## FUTURE BLUEPRINT NOTES
- **Export Functionality:** We will add functional buttons to export the Grid Views to PDF and CSV. Currently, these are placeholder buttons.
- **Mobile Layout:** The current complex financial tables are designed for Desktop. A specific mobile card view will be implemented in a future iteration.
