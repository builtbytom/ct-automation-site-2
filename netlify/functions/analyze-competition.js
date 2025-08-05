// Competition Analysis Function
// Analyzes local business competition using Google Places API

// Calculate distance between two points in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

// Generate missing keywords based on competitor analysis
function generateMissingKeywords(userBusiness, competitors, industry) {
  const keywords = [];
  
  // Industry-specific keywords
  const industryKeywords = {
    salon: ['online booking', 'walk-ins welcome', 'gift cards', 'color specialist'],
    restaurant: ['delivery', 'takeout', 'outdoor seating', 'reservations'],
    contractor: ['free estimates', 'licensed & insured', 'emergency service', '24/7'],
    medical: ['new patients', 'telehealth', 'same day appointments', 'accepts insurance'],
    retail: ['curbside pickup', 'online shopping', 'free shipping', 'returns accepted'],
  };
  
  // Add relevant industry keywords
  if (industryKeywords[industry]) {
    keywords.push(...industryKeywords[industry]);
  } else {
    // Generic keywords
    keywords.push('online booking', 'free consultation', 'appointments available');
  }
  
  // Check for missing online presence indicators
  if (!userBusiness?.website) {
    keywords.push('visit our website');
  }
  
  return keywords.slice(0, 5); // Return top 5
}

// Rate limiting setup
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_IP = 10;

// Simple in-memory cache (resets on function cold start)
const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { businessName, location, industry } = JSON.parse(event.body);

    // Validate inputs
    if (!businessName || !location) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Business name and location are required' }),
      };
    }

    // Get client IP for rate limiting
    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    
    // Check rate limit
    const now = Date.now();
    const userRequests = rateLimit.get(clientIp) || [];
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_IP) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      };
    }
    
    // Update rate limit
    recentRequests.push(now);
    rateLimit.set(clientIp, recentRequests);

    // Create cache key
    const cacheKey = `${businessName.toLowerCase()}-${location.toLowerCase()}`;
    
    // Check cache
    const cachedResult = cache.get(cacheKey);
    if (cachedResult && (now - cachedResult.timestamp < CACHE_DURATION)) {
      console.log('Returning cached result for:', cacheKey);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cachedResult.data,
          cached: true,
          cacheAge: Math.round((now - cachedResult.timestamp) / 1000 / 60), // minutes
        }),
      };
    }

    // Get API key from environment
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key not configured');
      // Fall back to mock data if no API key
      const mockData = generateMockData(businessName, location, industry);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...mockData, mock: true }),
      };
    }

    try {
      // First try to find the specific business
      const businessSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName + ' ' + location)}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log('Searching for business:', businessName, location);
      const businessSearchResponse = await fetch(businessSearchUrl);
      const businessSearchData = await businessSearchResponse.json();
      
      let userBusiness = null;
      if (businessSearchData.status === 'OK' && businessSearchData.results.length > 0) {
        userBusiness = businessSearchData.results[0];
        console.log('Found user business:', userBusiness.name, userBusiness.rating, userBusiness.user_ratings_total);
      }
      
      // Then search for competitors
      let competitorQuery;
      
      // Special handling for different industries
      const industrySearchTerms = {
        salon: 'hair salons nail salons',
        spa: 'spa day spa massage',
        contractor: 'general contractor home improvement',
        plumber: 'plumber plumbing service',
        electrician: 'electrician electrical contractor',
        hvac: 'hvac heating cooling air conditioning',
        landscaping: 'landscaping lawn care',
        retail: 'retail store shop',
        medical: 'doctor medical clinic healthcare',
        dental: 'dentist dental office',
        veterinary: 'veterinarian animal hospital',
        automotive: 'auto repair mechanic car service',
        fitness: 'gym fitness center health club',
        real_estate: 'real estate agency realtor',
        insurance: 'insurance agency agent',
        accounting: 'accountant cpa tax service',
        law: 'lawyer attorney law firm',
        daycare: 'daycare childcare preschool',
        cleaning: 'cleaning service house cleaning',
      };
      
      if (industrySearchTerms[industry]) {
        competitorQuery = `${industrySearchTerms[industry]} near ${location}`;
      } else if (industry) {
        competitorQuery = `${industry} near ${location}`;
      } else {
        competitorQuery = `businesses near ${location}`;
      }
      
      // Add type parameter for certain industries
      const placeTypes = {
        salon: 'beauty_salon',
        spa: 'spa',
        restaurant: 'restaurant',
        dental: 'dentist',
        veterinary: 'veterinary_care',
        fitness: 'gym',
        real_estate: 'real_estate_agency',
        insurance: 'insurance_agency',
        accounting: 'accounting',
        law: 'lawyer',
        // Note: Many industries don't have specific Google place types
      };
      
      let placeType = '';
      if (placeTypes[industry]) {
        placeType = `&type=${placeTypes[industry]}`;
      }
      
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(competitorQuery)}${placeType}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log('Searching for competitors:', competitorQuery);
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
        console.error('Places API error:', searchData.status, searchData.error_message);
        throw new Error(`Google Places API error: ${searchData.status}`);
      }

      // Process results
      const places = searchData.results || [];

      // Get detailed data for user business if found
      let userBusinessDetails = null;
      if (userBusiness && userBusiness.place_id) {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${userBusiness.place_id}&fields=name,rating,user_ratings_total,opening_hours,website,photos,geometry&key=${GOOGLE_PLACES_API_KEY}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          if (detailsData.status === 'OK') {
            userBusinessDetails = detailsData.result;
          }
        } catch (err) {
          console.error('Error fetching user business details:', err);
        }
      }

      // Get competitor data with additional fields
      const competitors = [];
      const userLat = userBusinessDetails?.geometry?.location?.lat;
      const userLng = userBusinessDetails?.geometry?.location?.lng;
      
      for (const place of places.filter(p => !userBusiness || p.place_id !== userBusiness.place_id).slice(0, 5)) {
        const competitor = {
          name: place.name,
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          monthlyReviews: Math.floor((place.user_ratings_total || 0) / 24), // Estimate
          address: place.formatted_address,
          placeId: place.place_id,
          hasWebsite: !!place.website,
          photoCount: place.photos?.length || 0,
          isOpen: place.opening_hours?.open_now,
          priceLevel: place.price_level,
        };
        
        // Calculate distance if we have user's location
        if (userLat && userLng && place.geometry?.location) {
          const distance = calculateDistance(
            userLat, userLng,
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          competitor.distance = distance;
        }
        
        competitors.push(competitor);
      }

      // Calculate averages
      const avgRating = competitors.length > 0 
        ? (competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length).toFixed(1)
        : 0;
      const avgReviews = competitors.length > 0
        ? Math.floor(competitors.reduce((sum, c) => sum + c.reviewCount, 0) / competitors.length)
        : 0;

      // Additional analysis
      const competitorsWithin1Mile = competitors.filter(c => c.distance && c.distance <= 1).length;
      const competitorsWithWebsite = competitors.filter(c => c.hasWebsite).length;
      const avgPhotoCount = competitors.length > 0
        ? Math.floor(competitors.reduce((sum, c) => sum + c.photoCount, 0) / competitors.length)
        : 0;
      
      // Hours analysis
      let hoursComparison = null;
      if (userBusinessDetails?.opening_hours?.weekday_text) {
        hoursComparison = {
          isOpen: userBusinessDetails.opening_hours.open_now,
          weekdayText: userBusinessDetails.opening_hours.weekday_text,
          // Note: Detailed hours comparison would require parsing weekday_text
        };
      }

      // Build response
      const analysisData = {
        businessName,
        location,
        analysis: {
          you: {
            rating: userBusinessDetails ? (userBusinessDetails.rating || userBusiness?.rating || 0) : 0,
            reviewCount: userBusinessDetails ? (userBusinessDetails.user_ratings_total || userBusiness?.user_ratings_total || 0) : 0,
            monthlyReviews: userBusinessDetails ? Math.floor((userBusinessDetails.user_ratings_total || userBusiness?.user_ratings_total || 0) / 24) : 0,
            hasWebsite: !!userBusinessDetails?.website,
            photoCount: userBusinessDetails?.photos?.length || 0,
            hoursData: hoursComparison,
          },
          average: {
            rating: avgRating,
            reviewCount: avgReviews,
            monthlyReviews: Math.floor(avgReviews / 24),
            photoCount: avgPhotoCount,
          },
          leader: competitors[0] || { name: 'No competitors found', rating: 0, reviewCount: 0 },
          competitors: competitors,
          insights: {
            competitorsWithin1Mile,
            closestCompetitor: competitors.find(c => c.distance)?.distance || null,
            competitorsWithWebsite,
            websitePercentage: competitors.length > 0 ? Math.round((competitorsWithWebsite / competitors.length) * 100) : 0,
          },
          missingKeywords: generateMissingKeywords(userBusinessDetails, competitors, industry),
          opportunities: [],
        },
        competitorCount: competitors.length,
        generatedAt: new Date().toISOString(),
        usingRealData: true,
      };

      // Generate opportunities based on real data
      if (analysisData.analysis.you.rating < parseFloat(avgRating)) {
        analysisData.analysis.opportunities.push({
          type: 'rating',
          title: 'Below Average Rating',
          description: `Your ${analysisData.analysis.you.rating} star rating is below the local average of ${avgRating}`,
          impact: 'high',
          automation: 'Automated review request campaigns to happy customers',
        });
      }
      
      // Online presence opportunities
      if (!analysisData.analysis.you.hasWebsite && analysisData.analysis.insights.websitePercentage > 50) {
        analysisData.analysis.opportunities.push({
          type: 'online_presence',
          title: 'Missing Website',
          description: `${analysisData.analysis.insights.websitePercentage}% of your competitors have websites. You're missing online visibility.`,
          impact: 'high',
          automation: 'Quick website setup with automated content updates',
        });
      }
      
      if (analysisData.analysis.you.photoCount < avgPhotoCount) {
        analysisData.analysis.opportunities.push({
          type: 'visual_content',
          title: 'Low Photo Count',
          description: `You have ${analysisData.analysis.you.photoCount} photos. Competitors average ${avgPhotoCount}. More photos = more clicks.`,
          impact: 'medium',
          automation: 'Automated photo reminders and upload assistance',
        });
      }
      
      // Proximity warning
      if (competitorsWithin1Mile >= 3) {
        analysisData.analysis.opportunities.push({
          type: 'proximity',
          title: 'High Local Competition',
          description: `${competitorsWithin1Mile} direct competitors within 1 mile. Need to differentiate strongly.`,
          impact: 'high',
          automation: 'Hyperlocal SEO and targeted review campaigns',
        });
      }


      // Cache the result
      cache.set(cacheKey, {
        timestamp: now,
        data: analysisData,
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      };

    } catch (error) {
      console.error('Error calling Google Places API:', error);
      
      // Fall back to mock data on error
      const mockData = generateMockData(businessName, location, industry);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...mockData, mock: true, error: error.message }),
      };
    }

  } catch (error) {
    console.error('Error analyzing competition:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to analyze competition' }),
    };
  }
};

// Generate mock data for testing
function generateMockData(businessName, location, industry) {
  // Random data within realistic ranges
  const yourRating = (3.5 + Math.random() * 1.5).toFixed(1);
  const yourReviews = Math.floor(50 + Math.random() * 150);
  const avgRating = (4.0 + Math.random() * 0.5).toFixed(1);
  const avgReviews = Math.floor(100 + Math.random() * 100);
  
  const competitors = [
    {
      name: `${industry ? industry.charAt(0).toUpperCase() + industry.slice(1) : 'Local'} Pro Services`,
      rating: (4.2 + Math.random() * 0.7).toFixed(1),
      reviewCount: Math.floor(150 + Math.random() * 200),
      monthlyReviews: Math.floor(5 + Math.random() * 10),
      distance: (0.5 + Math.random() * 2).toFixed(1),
      hasWebsite: Math.random() > 0.3,
      photoCount: Math.floor(10 + Math.random() * 30),
    },
    {
      name: `${location} ${industry || 'Business'} Experts`,
      rating: (4.0 + Math.random() * 0.8).toFixed(1),
      reviewCount: Math.floor(80 + Math.random() * 120),
      monthlyReviews: Math.floor(3 + Math.random() * 7),
      distance: (0.8 + Math.random() * 3).toFixed(1),
      hasWebsite: Math.random() > 0.4,
      photoCount: Math.floor(5 + Math.random() * 25),
    },
    {
      name: `Premier ${industry || 'Service'} Solutions`,
      rating: (4.5 + Math.random() * 0.4).toFixed(1),
      reviewCount: Math.floor(200 + Math.random() * 150),
      monthlyReviews: Math.floor(8 + Math.random() * 12),
      distance: (1.2 + Math.random() * 2).toFixed(1),
      hasWebsite: true,
      photoCount: Math.floor(20 + Math.random() * 40),
    },
    {
      name: `${location} ${industry || 'Business'} Center`,
      rating: (3.8 + Math.random() * 0.9).toFixed(1),
      reviewCount: Math.floor(60 + Math.random() * 100),
      monthlyReviews: Math.floor(2 + Math.random() * 5),
      distance: (0.3 + Math.random() * 1.5).toFixed(1),
      hasWebsite: Math.random() > 0.5,
      photoCount: Math.floor(3 + Math.random() * 15),
    },
    {
      name: `Quality ${industry || 'Service'} Co`,
      rating: (4.1 + Math.random() * 0.6).toFixed(1),
      reviewCount: Math.floor(100 + Math.random() * 150),
      monthlyReviews: Math.floor(4 + Math.random() * 8),
      distance: (2.0 + Math.random() * 3).toFixed(1),
      hasWebsite: Math.random() > 0.2,
      photoCount: Math.floor(8 + Math.random() * 20),
    },
  ];

  // Sort by rating
  competitors.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

  // Calculate your metrics
  const yourMonthlyReviews = Math.floor(1 + Math.random() * 4);

  // Keywords analysis
  const missingKeywords = [
    'online booking',
    'appointment scheduling',
    'text reminders',
    'credit cards accepted',
    'free estimates',
  ].slice(0, Math.floor(2 + Math.random() * 3));

  // Calculate additional insights
  const competitorsWithin1Mile = competitors.filter(c => parseFloat(c.distance) <= 1).length;
  const competitorsWithWebsite = competitors.filter(c => c.hasWebsite).length;
  const avgPhotoCount = Math.floor(competitors.reduce((sum, c) => sum + c.photoCount, 0) / competitors.length);
  
  return {
    businessName,
    location,
    analysis: {
      you: {
        rating: yourRating,
        reviewCount: yourReviews,
        monthlyReviews: yourMonthlyReviews,
        hasWebsite: Math.random() > 0.4,
        photoCount: Math.floor(5 + Math.random() * 20),
        hoursData: {
          isOpen: Math.random() > 0.3,
        },
      },
      average: {
        rating: avgRating,
        reviewCount: avgReviews,
        monthlyReviews: Math.floor(competitors.reduce((sum, c) => sum + c.monthlyReviews, 0) / competitors.length),
        photoCount: avgPhotoCount,
      },
      leader: competitors[0],
      competitors,
      insights: {
        competitorsWithin1Mile,
        closestCompetitor: competitors[0].distance,
        competitorsWithWebsite,
        websitePercentage: Math.round((competitorsWithWebsite / competitors.length) * 100),
      },
      missingKeywords,
      opportunities: generateOpportunities(yourMonthlyReviews, avgRating, yourRating),
    },
    competitorCount: competitors.length,
    generatedAt: new Date().toISOString(),
  };
}

// Generate improvement opportunities based on data
function generateOpportunities(monthlyReviews, avgRating, yourRating) {
  const opportunities = [];

  if (monthlyReviews < 5) {
    opportunities.push({
      type: 'review_velocity',
      title: 'Slow Review Growth',
      description: `You're getting ${monthlyReviews} reviews/month. Top competitors get 10+`,
      impact: 'medium',
      automation: 'Automated review request campaigns',
    });
  }

  if (parseFloat(yourRating) < parseFloat(avgRating)) {
    opportunities.push({
      type: 'rating',
      title: 'Below Average Rating',
      description: 'Your rating is below the local average',
      impact: 'high',
      automation: 'Customer satisfaction tracking and follow-up',
    });
  }

  opportunities.push({
    type: 'keywords',
    title: 'Missing Important Keywords',
    description: 'Customers searching for these features won\'t find you',
    impact: 'medium',
    automation: 'SEO-optimized review responses',
  });

  return opportunities;
}