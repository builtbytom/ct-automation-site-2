// Competition Analysis Function
// Analyzes local business competition using Google Places API

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

      // Get competitor data (exclude the user's business if found)
      const competitors = places
        .filter(place => !userBusiness || place.place_id !== userBusiness.place_id)
        .slice(0, 5)
        .map(place => ({
          name: place.name,
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          monthlyReviews: Math.floor((place.user_ratings_total || 0) / 24), // Estimate
          address: place.formatted_address,
          placeId: place.place_id,
        }));

      // Calculate averages
      const avgRating = competitors.length > 0 
        ? (competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length).toFixed(1)
        : 0;
      const avgReviews = competitors.length > 0
        ? Math.floor(competitors.reduce((sum, c) => sum + c.reviewCount, 0) / competitors.length)
        : 0;

      // Build response
      const analysisData = {
        businessName,
        location,
        analysis: {
          you: {
            rating: userBusiness ? (userBusiness.rating || 0) : 0,
            reviewCount: userBusiness ? (userBusiness.user_ratings_total || 0) : 0,
            monthlyReviews: userBusiness ? Math.floor((userBusiness.user_ratings_total || 0) / 24) : 0,
          },
          average: {
            rating: avgRating,
            reviewCount: avgReviews,
            monthlyReviews: Math.floor(avgReviews / 24),
          },
          leader: competitors[0] || { name: 'No competitors found', rating: 0, reviewCount: 0 },
          competitors: competitors,
          missingKeywords: ['online booking', 'appointment scheduling', 'text reminders'],
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
    },
    {
      name: `${location} ${industry || 'Business'} Experts`,
      rating: (4.0 + Math.random() * 0.8).toFixed(1),
      reviewCount: Math.floor(80 + Math.random() * 120),
      monthlyReviews: Math.floor(3 + Math.random() * 7),
    },
    {
      name: `Premier ${industry || 'Service'} Solutions`,
      rating: (4.5 + Math.random() * 0.4).toFixed(1),
      reviewCount: Math.floor(200 + Math.random() * 150),
      monthlyReviews: Math.floor(8 + Math.random() * 12),
    },
    {
      name: `${location} ${industry || 'Business'} Center`,
      rating: (3.8 + Math.random() * 0.9).toFixed(1),
      reviewCount: Math.floor(60 + Math.random() * 100),
      monthlyReviews: Math.floor(2 + Math.random() * 5),
    },
    {
      name: `Quality ${industry || 'Service'} Co`,
      rating: (4.1 + Math.random() * 0.6).toFixed(1),
      reviewCount: Math.floor(100 + Math.random() * 150),
      monthlyReviews: Math.floor(4 + Math.random() * 8),
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

  return {
    businessName,
    location,
    analysis: {
      you: {
        rating: yourRating,
        reviewCount: yourReviews,
        monthlyReviews: yourMonthlyReviews,
      },
      average: {
        rating: avgRating,
        reviewCount: avgReviews,
        monthlyReviews: Math.floor(competitors.reduce((sum, c) => sum + c.monthlyReviews, 0) / competitors.length),
      },
      leader: competitors[0],
      competitors,
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