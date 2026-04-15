package com.evora.projection;

import java.util.List;
import java.util.Optional;

public interface OrderViewRepository {
    void save(OrderView orderView);

    Optional<OrderView> findByOrderId(String orderId);

    List<OrderView> findAll();

    void clearAll();
}
