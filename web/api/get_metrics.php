<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Database connection
$host = 'localhost';
$dbname = 'olap_datn';
$username = 'root';
$password = 'phuocle11001203';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Get total products
    $stmt = $pdo->query("SELECT COUNT(DISTINCT ASIN) as total_products FROM fact_product_overview");
    $totalProducts = $stmt->fetch(PDO::FETCH_ASSOC)['total_products'];

    // 2. Get product distribution by category
    $stmt = $pdo->query("
        SELECT 
            c.CategoryName,
            COUNT(DISTINCT f.ASIN) as product_count
        FROM fact_product_overview f
        JOIN dim_category c ON f.CategoryID = c.CategoryID
        GROUP BY c.CategoryName
        ORDER BY product_count DESC
    ");
    $categoryDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Get average price
    $stmt = $pdo->query("
        SELECT AVG(Price) as avg_price 
        FROM fact_product_overview 
        WHERE Price > 0
    ");
    $avgPrice = $stmt->fetch(PDO::FETCH_ASSOC)['avg_price'];

    // 4. Get top selling country with product count
    $stmt = $pdo->query("
        SELECT 
            c.CountryName,
            COUNT(DISTINCT f.ASIN) as product_count
        FROM fact_product_overview f
        JOIN dim_country c ON f.CountryID = c.CountryID
        GROUP BY c.CountryName
        ORDER BY product_count DESC
        LIMIT 1
    ");
    $topCountry = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'totalProducts' => $totalProducts,
        'categoryDistribution' => $categoryDistribution,
        'averagePrice' => number_format($avgPrice, 2),
        'topCountry' => [
            'name' => $topCountry['CountryName'],
            'productCount' => $topCountry['product_count']
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?> 