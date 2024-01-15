const axios = require("axios");
const express = require("express");
const app = express();
let clinicalDataForDisease
async function DiseaseDataExtraction(disease,howManyPages, data = [], pageToken = false, count = 0) {
  try {
    const getUrl = pageToken?`https://clinicaltrials.gov/api/v2/studies?query.titles=${disease}&pageToken=${pageToken}`:`https://clinicaltrials.gov/api/v2/studies?query.titles=${disease}`;
    const pageData = await axios.get(getUrl);
    const modData = pageData.data.studies.map((element) => {
      const {
        nctId,
        organization,
        minimumAge,
        maximumAge,
        healthyVolunteers,
        oversightModule,
        designModule
      } = element.protocolSection;

      const locations = element.protocolSection.contactsLocationsModule?.locations || [];
      const centralContacts = element.protocolSection.contactsLocationsModule?.centralContacts || {};

      if (locations.length > 0 && locations[0].country === 'United States') {
        return {
          disease,
          study: nctId || '',
          Org_name: organization?.fullName || '',
          min_age_eligible: minimumAge || '',
          max_age_eligible: maximumAge || '',
          healthyVolunteers: healthyVolunteers || '',
          isFdaRegulatedDevice: oversightModule?.oversightModule || '',
          isFdaRegulatedDrug: oversightModule?.isFdaRegulatedDrug || '',
          entrolled_pop: designModule?.enrollmentInfo?.count || '',
          locations,
          centralContacts
        };
      } else {
        return null;
      }
    });

    const filteredModData = modData.filter(data => data !== null);
    data = data.concat(filteredModData);

    if (pageData.data.nextPageToken && count < howManyPages) {
      await DiseaseDataExtraction(disease,howManyPages, data, pageData.data.nextPageToken, count + 1);
    }
    else{
      clinicalDataForDisease = data
    }

  } catch (error) {
    console.error('Error during page extraction:', error);
    throw error; // Propagate the error
  }
}

app.get("/diseaseinfo", async (req, res) => {
  try {
    const disease = req.query.disease;
    const howManyPages = parseInt(req.query.pages) || 99
    // let clinicalDataForDisease; // Declare clinicalDataForDisease within the scope of this function
    await DiseaseDataExtraction(disease,howManyPages);
    res.send(clinicalDataForDisease);
  } catch (error) {
    console.error('Error in API request:', error);
    res.status(500).send("Internal Server Error");
  }
});


const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
