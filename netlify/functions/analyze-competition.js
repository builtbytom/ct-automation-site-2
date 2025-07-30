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

    // TODO: Implement actual Google Places API call
    // For now, return mock data
    const mockData = generateMockData(businessName, location, industry);

    // Cache the result
    cache.set(cacheKey, {
      timestamp: now,
      data: mockData,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockData),
    };

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
      responseRate: Math.floor(70 + Math.random() * 30),
      monthlyReviews: Math.floor(5 + Math.random() * 10),
    },
    {
      name: `${location} ${industry || 'Business'} Experts`,
      rating: (4.0 + Math.random() * 0.8).toFixed(1),
      reviewCount: Math.floor(80 + Math.random() * 120),
      responseRate: Math.floor(40 + Math.random() * 40),
      monthlyReviews: Math.floor(3 + Math.random() * 7),
    },
    {
      name: `Premier ${industry || 'Service'} Solutions`,
      rating: (4.5 + Math.random() * 0.4).toFixed(1),
      reviewCount: Math.floor(200 + Math.random() * 150),
      responseRate: Math.floor(80 + Math.random() * 20),
      monthlyReviews: Math.floor(8 + Math.random() * 12),
    },
    {
      name: `${location} ${industry || 'Business'} Center`,
      rating: (3.8 + Math.random() * 0.9).toFixed(1),
      reviewCount: Math.floor(60 + Math.random() * 100),
      responseRate: Math.floor(20 + Math.random() * 40),
      monthlyReviews: Math.floor(2 + Math.random() * 5),
    },
    {
      name: `Quality ${industry || 'Service'} Co`,
      rating: (4.1 + Math.random() * 0.6).toFixed(1),
      reviewCount: Math.floor(100 + Math.random() * 150),
      responseRate: Math.floor(50 + Math.random() * 30),
      monthlyReviews: Math.floor(4 + Math.random() * 8),
    },
  ];

  // Sort by rating
  competitors.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

  // Calculate your metrics
  const yourResponseRate = Math.floor(10 + Math.random() * 30); // Intentionally low to show opportunity
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
        responseRate: yourResponseRate,
        monthlyReviews: yourMonthlyReviews,
      },
      average: {
        rating: avgRating,
        reviewCount: avgReviews,
        responseRate: Math.floor(competitors.reduce((sum, c) => sum + c.responseRate, 0) / competitors.length),
        monthlyReviews: Math.floor(competitors.reduce((sum, c) => sum + c.monthlyReviews, 0) / competitors.length),
      },
      leader: competitors[0],
      competitors,
      missingKeywords,
      opportunities: generateOpportunities(yourResponseRate, yourMonthlyReviews, avgRating, yourRating),
    },
    competitorCount: competitors.length,
    generatedAt: new Date().toISOString(),
  };
}

// Generate improvement opportunities based on data
function generateOpportunities(responseRate, monthlyReviews, avgRating, yourRating) {
  const opportunities = [];

  if (responseRate < 50) {
    opportunities.push({
      type: 'response_rate',
      title: 'Low Review Response Rate',
      description: `You're only responding to ${responseRate}% of reviews. Competitors average 65%+`,
      impact: 'high',
      automation: 'Automated review response system',
    });
  }

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