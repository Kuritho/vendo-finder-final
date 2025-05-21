import React from 'react';
import { useNavigate } from 'react-router-dom';


class Vendo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            vendoName: "",
            selectedSize: "Small",
            products: [],
            loading: true,
            error: null,
            showOrders: false,
            orders: []
        };
    }

    async componentDidMount() {
        try {
            let vendoId = window.location.href.split("/").pop();
            
            // Define product configurations for each vendo
            const vendoProducts = {
                '4': [
                    { 
                        id: 58, 
                        alt: "Pampers Small", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/pampers-small.png",
                        apiId: 58
                    },
                    { 
                        id: 59, 
                        alt: "Pampers Medium", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/pampers-medium.png",
                        apiId: 59
                    },
                    { 
                        id: 60, 
                        alt: "Pampers Large", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/pampers-large.png",
                        apiId: 60
                    },
                    { 
                        id: 61, 
                        alt: "Wipes", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/wipes.png" 
                    },
                    { 
                        id: 62, 
                        alt: "Tissue", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/tissue.jpg" 
                    }
                ],
                '5': [
                    { 
                        id: 68, 
                        alt: "Pampers Small", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/pampers-small.png" 
                    },
                    { 
                        id: 69, 
                        alt: "Pampers Medium", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/pampers-medium.png" 
                    },
                    { 
                        id: 70, 
                        alt: "Pampers Large", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/pampers-large.png" 
                    },
                    { 
                        id: 71, 
                        alt: "Wipes", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/wipes.png" 
                    },
                    { 
                        id: 72, 
                        alt: "Tissue", 
                        price: null, 
                        stock: null, 
                        imageUrl: "/assets/images/tissue.jpg" 
                    }
                ]
            };

            // Set initial products based on vendoId
            const initialProducts = vendoProducts[vendoId] || [];
            this.setState({ products: initialProducts });

            // Fetch vendo information
            const vendoResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Vendo/GetVendo/${vendoId}`)
            if (!vendoResponse.ok) throw new Error(`Failed to fetch vendo: ${vendoResponse.status}`);
            
            const vendoData = await vendoResponse.json();
            if (!vendoData.success) throw new Error(vendoData.message || "Vendo not found");
    
            // Fetch product information for all products
            const productFetchPromises = initialProducts
                .filter(product => product.id !== null)
                .map(async product => {
                    try {
                        const endpoint = product.apiId 
                            ? `${process.env.REACT_APP_API_BASE_URL}/api/ProductVariant/${product.apiId}`
                            : `${process.env.REACT_APP_API_BASE_URL}/api/ProductVariant/${product.id}`;
                        
                        const response = await fetch(endpoint);
                        if (!response.ok) throw new Error(`Failed to fetch product variant ${product.id}`);
                        const data = await response.json();
                        
                        const variantData = data.data || data;
                        
                        return {
                            success: true,
                            id: product.id,
                            data: variantData
                        };
                    } catch (error) {
                        console.error(`Error fetching product ${product.id}:`, error);
                        return { 
                            success: false,
                            id: product.id,
                            error: error.message 
                        };
                    }
                });
    
            const productResponses = await Promise.all(productFetchPromises);
    
            // Update state with fetched data
            this.setState(prevState => {
                const updatedProducts = [...prevState.products];
                
                productResponses.forEach(response => {
                    if (!response.success) return;
                    
                    const productIndex = updatedProducts.findIndex(p => p.id === response.id);
                    if (productIndex === -1) return;
    
                    updatedProducts[productIndex] = {
                        ...updatedProducts[productIndex],
                        price: response.data.price?.toString() || updatedProducts[productIndex].price,
                        stock: response.data.stock ?? updatedProducts[productIndex].stock,
                        description: response.data.description || "No description available",
                        name: response.data.name || updatedProducts[productIndex].alt
                    };
                });
    
                return {
                    vendoName: vendoData.data.name,
                    products: updatedProducts,
                    loading: false
                };
            });
    
        } catch (error) {
            console.error("Initialization error:", error);
            this.setState({ 
                error: error.message,
                loading: false 
            });
        }
    };

    goBack = () => {
        window.location.href = "/";
    };

    navigateToReserved = () => {
        const vendoId = window.location.href.split("/").pop();
        this.props.navigate(`/vendo/${vendoId}/reserved`);
    };

    toggleOrders = async () => {
        try {
            if (!this.state.showOrders) {
                // Fetch orders when showing them
                const vendoId = window.location.href.split("/").pop();
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Vendo/GetOrders/${vendoId}`);
                if (!response.ok) throw new Error('Failed to fetch orders');
                
                const data = await response.json();
                this.setState({ 
                    orders: data.data || data,
                    showOrders: true 
                });
            } else {
                this.setState({ showOrders: false });
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            alert("Failed to fetch orders. Please try again.");
        }
    };

 handleReserve = async (product) => {
    try {
        const vendoId = window.location.href.split("/").pop();
        
        if (product.stock > 0) {
            // Save to localStorage with all necessary information
            const savedItems = JSON.parse(localStorage.getItem(`reservedItems_${vendoId}`)) || [];
            
            // Check if item already exists in reserved items
            const existingItemIndex = savedItems.findIndex(item => item.productId === product.id);
            
            if (existingItemIndex >= 0) {
                // If item exists, increment quantity
                savedItems[existingItemIndex].quantity += 1;
            } else {
                // If new item, add to reserved items
                savedItems.push({
                    productId: product.id,
                    productName: product.alt,
                    price: product.price,
                    quantity: 1,
                    imageUrl: product.imageUrl
                });
            }
            
            localStorage.setItem(`reservedItems_${vendoId}`, JSON.stringify(savedItems));
            
            // Update stock in UI
            this.setState(prevState => {
                const productIndex = prevState.products.findIndex(p => p.id === product.id);
                if (productIndex === -1) return null;
                
                const updatedProducts = [...prevState.products];
                updatedProducts[productIndex].stock -= 1;
                
                return { products: updatedProducts };
            });
            
            alert(`Reserved: ${product.alt}`);
        } else {
            alert(`Out of stock: ${product.alt}`);
        }
    } catch (error) {
        console.error("Reservation error:", error);
        alert("Failed to make reservation. Please try again.");
    }
};

    render() {
        const { loading, error, vendoName, products, showOrders, orders } = this.state;
        
        if (loading) {
            return <div style={styles.loading}>Loading vendo information...</div>;
        }

        if (error) {
            return (
                <div style={styles.errorContainer}>
                    <div style={styles.error}>Error: {error}</div>
                    <button style={styles.backButton} onClick={this.goBack}>Back to Homepage</button>
                </div>
            );
        }

        return (
            <div style={styles.container}>
                <h1 style={styles.heading}>Welcome: {vendoName}</h1>
                <div style={styles.buttonGroup}>
                    <button style={styles.backButton} onClick={this.goBack}>Back to Homepage</button>
                    <button 
                        style={styles.reservedButton}
                        onClick={this.navigateToReserved}
                    >
                        View Reserved Items
                    </button>
                </div>
                
                {showOrders ? (
                    <div style={styles.ordersContainer}>
                        <h2 style={styles.ordersHeading}>Order History</h2>
                        {orders.length > 0 ? (
                            <table style={styles.ordersTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>Product</th>
                                        <th style={styles.tableHeader}>Date</th>
                                        <th style={styles.tableHeader}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, index) => (
                                        <tr key={index}>
                                            <td style={styles.tableCell}>{order.product}</td>
                                            <td style={styles.tableCell}>{new Date(order.timestamp).toLocaleString()}</td>
                                            <td style={styles.tableCell}>{order.status || 'Completed'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={styles.noOrders}>No orders found</p>
                        )}
                    </div>
                ) : (
                    <>
                        <p style={styles.instructionText}>Please select your Item</p>
                        <div style={styles.imageContainer}>
                            {products.map((product, index) => (
                                <div key={index} style={styles.itemWrapper}>
                                    <img src={product.imageUrl} alt={product.alt} style={styles.image} />
                                    <h3 style={styles.productTitle}>{product.name || product.alt}</h3>
                                    <p style={styles.price}>Price: ₱{product.price || "Loading..."}</p>
                                    <p style={styles.stock}>Stock: {product.stock !== null ? product.stock : "Loading..."}</p>
                                    {product.description && (
                                        <p style={styles.description}>{product.description}</p>
                                    )}
                                    <button 
                                        style={{
                                            ...styles.reserveButton,
                                            ...(product.stock === 0) ? 
                                                { backgroundColor: 'gray', cursor: 'not-allowed' } : {}
                                        }}
                                        onClick={() => this.handleReserve(product)}
                                        disabled={product.stock === 0}
                                    >
                                        Reserve
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }
}

// Wrapper component to use hooks with class component
export default function(props) {
    const navigate = useNavigate();
    return <Vendo {...props} navigate={navigate} />;
}

const styles = {
    container: {
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#F7F7F7',
        padding: '20px',
        minHeight: '100vh'
    },
    heading: {
        color: '#4A4E69',
        marginBottom: '20px'
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '20px'
    },
    backButton: {
        backgroundColor: '#9A8C98',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '16px',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#8A7C88'
        }
    },
    reservedButton: {
        backgroundColor: '#4A4E69',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '16px',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#3A3E59'
        }
    },
    instructionText: {
        color: '#4A4E69',
        fontSize: '18px',
        marginBottom: '30px'
    },
    imageContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '30px',
        marginTop: '20px',
    },
    itemWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#C9ADA7',
        padding: '20px',
        borderRadius: '10px',
        width: '280px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    productTitle: {
        margin: '10px 0 5px 0',
        color: '#22223B',
        fontSize: '18px'
    },
    image: {
        width: '180px',
        height: '160px',
        border: '3px solid #22223B',
        borderRadius: '8px',
        objectFit: 'cover'
    },
    price: {
        marginTop: '10px',
        fontSize: '16px',
        color: '#22223B',
        fontWeight: 'bold'
    },
    stock: {
        marginTop: '5px',
        fontSize: '14px',
        color: '#4A4E69'
    },
    description: {
        marginTop: '10px',
        fontSize: '12px',
        color: '#555',
        fontStyle: 'italic',
        textAlign: 'center'
    },
    reserveButton: {
        marginTop: '15px',
        backgroundColor: '#22223B',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '14px',
        width: '100%',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#1A1B2B'
        }
    },
    loading: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '20px',
        color: '#4A4E69'
    },
    errorContainer: {
        textAlign: 'center',
        padding: '40px'
    },
    error: {
        color: '#D32F2F',
        marginBottom: '30px',
        fontSize: '18px'
    },
    ordersContainer: {
        margin: '20px auto',
        maxWidth: '800px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    ordersHeading: {
        color: '#4A4E69',
        marginBottom: '20px'
    },
    ordersTable: {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '20px 0'
    },
    tableHeader: {
        backgroundColor: '#4A4E69',
        color: 'white',
        padding: '12px',
        textAlign: 'left'
    },
    tableCell: {
        padding: '12px',
        borderBottom: '1px solid #ddd',
        textAlign: 'left'
    },
    noOrders: {
        color: '#4A4E69',
        fontSize: '16px',
        margin: '20px 0'
    }
};