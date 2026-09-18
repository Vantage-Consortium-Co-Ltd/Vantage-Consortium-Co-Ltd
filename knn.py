import numpy as np
import matplotlib.pyplot as plt

def euclidean_distance(point1, point2):
    return np.sqrt(np.sum((np.array(point1) - np.array(point2))**2))


def knn_predict(training_data, training_labels, test_point, k):
    distances = []
    for i in range(len(training_data)):
        dist = euclidean_distance(test_point, training_data[i])
        distances.append((dist, training_labels[i]))
    distances.sort(key=lambda x: x[0])
    k_nearest_labels = [label for _, label in distances[:k]]
    
    latest_counter = 0
    latest_labels = 0
    for i in np.unique(k_nearest_labels):
        counter = 0
        for j in k_nearest_labels:
            if j == i:
                counter += 1
        if counter > latest_counter:
            latest_counter = counter
            latest_labels = i
    print(latest_labels)
    return latest_labels 
# return Counter(k_nearest_labels).most_common(1)[0][0]

training_data = np.array([[1, 2], [2, 3], [3, 4], [6, 7], [7, 8]])
training_labels = np.array([0, 0, 0, 1, 1])
test_point = np.array([4, 7])
k = 3

result = knn_predict(training_data, training_labels, test_point, 1)


plt.scatter(
    test_point[0], test_point[1],
    c=result,
    cmap="coolwarm",
    edgecolors="black",
    s=400,
    label="Test data"
)
plt.scatter(
    training_data[:, 0], training_data[:, 1],
    c=training_labels,
    cmap="coolwarm",
    edgecolors="black",
    s=100,
    label="Training data"
)
plt.show()
